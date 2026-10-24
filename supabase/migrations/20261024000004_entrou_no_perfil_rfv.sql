-- B43-03: gatilho "Entrou no perfil RFV". Toda madrugada (a partir das 3h de Brasília)
-- a conferência compara o perfil da hora de cada contato com o da conferência anterior
-- e anota quem mudou; as automações rodam depois, cada uma no horário dela, uma vez
-- por mudança. Tudo aqui é do service role: a rotina roda sem usuário logado.

-- 1. O gatilho novo entra na lista aceita (a coluna é gerada a partir do fluxo).
do $$
declare
  v_nome text;
begin
  for v_nome in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.automation_flows'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%gatilho_tipo%'
  loop
    execute format('alter table public.automation_flows drop constraint %I', v_nome);
  end loop;
end $$;

alter table public.automation_flows
  add constraint automation_flows_gatilho_tipo_check check (
    gatilho_tipo in (
      'mensagem_recebida',
      'mensagem_enviada_time',
      'conversa_criada',
      'card_movido',
      'tag_adicionada',
      'etiqueta_aplicada',
      'dado_contato_alterado',
      'entrou_perfil_rfv'
    )
  );

-- 2. O perfil de cada contato na última conferência ('sem_compras' quando não tem).
create table public.perfis_rfv_guardados (
  contact_id uuid primary key references public.contacts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  perfil text not null
);
create index perfis_rfv_guardados_workspace on public.perfis_rfv_guardados (workspace_id);

-- 3. A última conferência de cada empresa.
create table public.conferencias_perfil_rfv (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  dia date not null,
  feita_em timestamptz not null default now()
);

-- 4. O que a conferência anotou.
create table public.mudancas_perfil_rfv (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  de text not null,
  para text not null,
  dia date not null,
  created_at timestamptz not null default now()
);
create index mudancas_perfil_rfv_dia on public.mudancas_perfil_rfv (workspace_id, dia);

-- 5. Qual automação já rodou para qual mudança (a rotina pode chegar duas vezes).
create table public.disparos_perfil_rfv (
  flow_id uuid not null references public.automation_flows(id) on delete cascade,
  mudanca_id uuid not null references public.mudancas_perfil_rfv(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (flow_id, mudanca_id)
);

alter table public.perfis_rfv_guardados enable row level security;
alter table public.conferencias_perfil_rfv enable row level security;
alter table public.mudancas_perfil_rfv enable row level security;
alter table public.disparos_perfil_rfv enable row level security;

-- 6. A conferência de todas as empresas, uma vez por dia por empresa. Contato na
-- lixeira fica de fora (nem anota, nem atualiza o guardado). Na primeira conferência
-- da empresa, só guarda. Devolve quantas mudanças anotou. `p_workspace` limita a uma
-- empresa (os testes conferem só a empresa de teste, no banco que é o da produção).
create or replace function public.conferir_perfis_rfv(p_dia date, p_workspace uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ws uuid;
  v_ja_conferiu boolean;
  v_anotadas integer := 0;
  v_n integer;
begin
  for v_ws in select w.id from workspaces w where p_workspace is null or w.id = p_workspace loop
    -- Duas rotinas ao mesmo tempo não conferem a mesma empresa duas vezes
    perform pg_advisory_xact_lock(hashtext('conferir_perfis_rfv:' || v_ws::text));

    if exists (select 1 from conferencias_perfil_rfv c where c.workspace_id = v_ws and c.dia >= p_dia) then
      continue;
    end if;
    v_ja_conferiu := exists (select 1 from conferencias_perfil_rfv c where c.workspace_id = v_ws);

    create temporary table if not exists _perfis_agora (contact_id uuid primary key, perfil text not null) on commit drop;
    truncate _perfis_agora;
    insert into _perfis_agora (contact_id, perfil)
    select c.id, coalesce(r.perfil, 'sem_compras')
    from contacts c
    left join perfis_rfv_do_workspace(v_ws) r on r.contact_id = c.id
    where c.workspace_id = v_ws and c.excluido_em is null;

    if v_ja_conferiu then
      insert into mudancas_perfil_rfv (workspace_id, contact_id, de, para, dia)
      select v_ws, a.contact_id, coalesce(g.perfil, 'sem_compras'), a.perfil, p_dia
      from _perfis_agora a
      left join perfis_rfv_guardados g on g.contact_id = a.contact_id
      where coalesce(g.perfil, 'sem_compras') <> a.perfil;
      get diagnostics v_n = row_count;
      v_anotadas := v_anotadas + v_n;
    end if;

    insert into perfis_rfv_guardados (contact_id, workspace_id, perfil)
    select a.contact_id, v_ws, a.perfil from _perfis_agora a
    on conflict (contact_id) do update set perfil = excluded.perfil;

    insert into conferencias_perfil_rfv (workspace_id, dia, feita_em)
    values (v_ws, p_dia, now())
    on conflict (workspace_id) do update set dia = excluded.dia, feita_em = excluded.feita_em;
  end loop;
  return v_anotadas;
end;
$$;

revoke all on function public.conferir_perfis_rfv(date, uuid) from public, anon, authenticated;
grant execute on function public.conferir_perfis_rfv(date, uuid) to service_role;
