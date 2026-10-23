-- B41-01: funis da empresa, além de Entrada e Recompra, com etapas próprias.
--
-- O card de funil novo guarda o id do funil em pipeline_cards.funil e o id da
-- etapa em pipeline_cards.etapa (os dois como texto). Renomear funil ou etapa
-- não mexe nos cards. Entrada e Recompra continuam com os valores fixos de hoje.
-- Spec: pre-desenvolvimento/spec-funis-personalizados.md

create table public.funis (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  constraint funis_nome_tamanho check (char_length(btrim(nome)) between 1 and 40),
  constraint funis_nome_reservado check (lower(btrim(nome)) not in ('entrada', 'recompra'))
);

create unique index funis_nome_unico on public.funis (workspace_id, lower(btrim(nome)));

create table public.funil_etapas (
  id uuid primary key default gen_random_uuid(),
  funil_id uuid not null references public.funis(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nome text not null,
  cor text,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  constraint funil_etapas_nome_tamanho check (char_length(btrim(nome)) between 1 and 40),
  constraint funil_etapas_cor check (
    cor is null
    or cor in ('verde', 'amarelo', 'cinza', 'laranja', 'vermelho')
    or cor ~ '^#[0-9a-fA-F]{6}$'
  )
);

create unique index funil_etapas_nome_unico on public.funil_etapas (funil_id, lower(btrim(nome)));
create index funil_etapas_funil on public.funil_etapas (funil_id, ordem);

-- ---------------------------------------------------------------------------
-- RLS: todos da empresa leem; Admin e Gerente gravam.
-- ---------------------------------------------------------------------------

alter table public.funis enable row level security;
alter table public.funil_etapas enable row level security;

create policy "Membros veem os funis da empresa"
  on public.funis for select
  using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

create policy "Admin e Gerente gravam funis da empresa"
  on public.funis for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Membros veem as etapas dos funis da empresa"
  on public.funil_etapas for select
  using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

create policy "Admin e Gerente gravam etapas dos funis da empresa"
  on public.funil_etapas for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

-- ---------------------------------------------------------------------------
-- Limites (SUP-B41-02): 20 funis por empresa, 20 etapas por funil. A etapa é
-- sempre da mesma empresa do funil.
-- ---------------------------------------------------------------------------

create or replace function public.trg_limite_de_funis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from funis where workspace_id = new.workspace_id) >= 20 then
    raise exception 'Limite de 20 funis por empresa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger limite_de_funis
  before insert on public.funis
  for each row execute function public.trg_limite_de_funis();

create or replace function public.trg_etapa_do_funil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from funis where id = new.funil_id and workspace_id = new.workspace_id) then
    raise exception 'Funil não encontrado.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and (select count(*) from funil_etapas where funil_id = new.funil_id) >= 20 then
    raise exception 'Limite de 20 etapas por funil.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger etapa_do_funil
  before insert or update of funil_id, workspace_id on public.funil_etapas
  for each row execute function public.trg_etapa_do_funil();

-- ---------------------------------------------------------------------------
-- Criar o funil e as etapas de uma vez. security invoker: vale a RLS de quem chama.
-- p_etapas: [{ "nome": "...", "cor": "verde" | "#rrggbb" | null }, ...]
-- ---------------------------------------------------------------------------

create or replace function public.criar_funil(p_nome text, p_etapas jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_ws uuid;
  v_funil uuid;
  v_etapa jsonb;
  v_ordem int := 0;
begin
  select workspace_id into v_ws from profiles where id = auth.uid();
  if v_ws is null then
    raise exception 'Perfil não encontrado.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_etapas) <> 'array' or jsonb_array_length(p_etapas) = 0 then
    raise exception 'O funil precisa de ao menos uma etapa.' using errcode = 'P0001';
  end if;

  insert into funis (workspace_id, nome) values (v_ws, btrim(p_nome)) returning id into v_funil;

  for v_etapa in select * from jsonb_array_elements(p_etapas) loop
    insert into funil_etapas (funil_id, workspace_id, nome, cor, ordem)
      values (v_funil, v_ws, btrim(v_etapa->>'nome'), nullif(v_etapa->>'cor', ''), v_ordem);
    v_ordem := v_ordem + 1;
  end loop;

  return v_funil;
end;
$$;

revoke all on function public.criar_funil(text, jsonb) from public;
grant execute on function public.criar_funil(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- pipeline_cards: Entrada e Recompra com as etapas de hoje; funil novo precisa
-- ser da mesma empresa, e a etapa, desse funil.
-- ---------------------------------------------------------------------------

alter table public.pipeline_cards drop constraint if exists pipeline_cards_funil_check;
alter table public.pipeline_cards drop constraint if exists pipeline_cards_etapa_check;

create or replace function public.trg_validar_funil_e_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.funil = 'entrada' then
    if new.etapa not in ('lead', 'sondagem', 'catalogo_enviado', 'follow_catalogo', 'negociacao', 'nutricao', 'ganho', 'perdido') then
      raise exception 'Etapa inválida para o funil.' using errcode = '23514';
    end if;
  elsif new.funil = 'recompra' then
    if new.etapa not in ('onboarding', 'reposicao', 'ativos', 'ativos_ri', 'inativos', 'inativos_rp', 'perdidos') then
      raise exception 'Etapa inválida para o funil.' using errcode = '23514';
    end if;
  else
    if new.funil !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (select 1 from funis where id = new.funil::uuid and workspace_id = new.workspace_id) then
      raise exception 'Funil inválido.' using errcode = '23514';
    end if;
    if new.etapa !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (select 1 from funil_etapas where id = new.etapa::uuid and funil_id = new.funil::uuid) then
      raise exception 'Etapa inválida para o funil.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger validar_funil_e_etapa
  before insert or update of funil, etapa, workspace_id on public.pipeline_cards
  for each row execute function public.trg_validar_funil_e_etapa();

-- Tirar o card do funil novo: Admin e Gerente da empresa. Os cards de Entrada e
-- Recompra continuam saindo só pelos caminhos de hoje (lixeira, Ganho desfeito).
create policy "Admin e Gerente tiram cards dos funis da empresa"
  on public.pipeline_cards for delete
  using (
    funil not in ('entrada', 'recompra')
    and workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );
