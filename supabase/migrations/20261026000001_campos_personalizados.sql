-- B38-01: campos personalizados do contato, criados pela empresa.
--
-- O valor de cada campo fica em contato_campos, uma linha por contato e campo, só
-- quando há valor. Lista e Múltipla escolha guardam o id da opção, então renomear a
-- opção não mexe nos contatos. O tipo do campo não muda depois de criado.
-- Spec: pre-desenvolvimento/spec-campos-personalizados.md

create table public.campos_personalizados (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nome text not null,
  tipo text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  constraint campos_personalizados_nome_tamanho check (char_length(btrim(nome)) between 1 and 40),
  constraint campos_personalizados_tipo check (
    tipo in ('texto', 'texto_longo', 'numero', 'dinheiro', 'data', 'lista', 'multipla', 'sim_nao', 'link', 'email', 'telefone')
  )
);

create unique index campos_personalizados_nome_unico on public.campos_personalizados (workspace_id, lower(btrim(nome)));
create index campos_personalizados_ordem on public.campos_personalizados (workspace_id, ordem);

create table public.campo_opcoes (
  id uuid primary key default gen_random_uuid(),
  campo_id uuid not null references public.campos_personalizados(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  constraint campo_opcoes_nome_tamanho check (char_length(btrim(nome)) between 1 and 40)
);

create unique index campo_opcoes_nome_unico on public.campo_opcoes (campo_id, lower(btrim(nome)));
create index campo_opcoes_campo on public.campo_opcoes (campo_id, ordem);

create table public.contato_campos (
  contact_id uuid not null references public.contacts(id) on delete cascade,
  campo_id uuid not null references public.campos_personalizados(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  valor_texto text,
  valor_numero numeric,
  valor_data date,
  valor_booleano boolean,
  valor_opcoes uuid[],
  atualizado_em timestamptz not null default now(),
  primary key (contact_id, campo_id)
);

create index contato_campos_campo on public.contato_campos (campo_id);

-- ---------------------------------------------------------------------------
-- Regras que o banco segura (SUP-B38-06): 50 campos por empresa, 50 opções por
-- campo, tipo fixo, opção só em lista e múltipla, tudo da mesma empresa.
-- ---------------------------------------------------------------------------

create or replace function public.trg_limite_de_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from campos_personalizados where workspace_id = new.workspace_id) >= 50 then
    raise exception 'Limite de 50 campos por empresa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger limite_de_campos
  before insert on public.campos_personalizados
  for each row execute function public.trg_limite_de_campos();

create or replace function public.trg_tipo_do_campo_fixo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tipo is distinct from old.tipo then
    raise exception 'O tipo do campo não muda.' using errcode = 'P0001';
  end if;
  if new.workspace_id is distinct from old.workspace_id then
    raise exception 'O campo não muda de empresa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger tipo_do_campo_fixo
  before update on public.campos_personalizados
  for each row execute function public.trg_tipo_do_campo_fixo();

create or replace function public.trg_opcao_do_campo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo record;
begin
  select workspace_id, tipo into v_campo from campos_personalizados where id = new.campo_id;
  if v_campo is null or v_campo.workspace_id <> new.workspace_id then
    raise exception 'Campo não encontrado.' using errcode = 'P0001';
  end if;
  if v_campo.tipo not in ('lista', 'multipla') then
    raise exception 'Só Lista de opções e Múltipla escolha têm opções.' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and (select count(*) from campo_opcoes where campo_id = new.campo_id) >= 50 then
    raise exception 'Limite de 50 opções por campo.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger opcao_do_campo
  before insert or update on public.campo_opcoes
  for each row execute function public.trg_opcao_do_campo();

create or replace function public.trg_valor_do_campo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from campos_personalizados where id = new.campo_id and workspace_id = new.workspace_id)
     or not exists (select 1 from contacts where id = new.contact_id and workspace_id = new.workspace_id) then
    raise exception 'Campo ou contato de outra empresa.' using errcode = 'P0001';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger valor_do_campo
  before insert or update on public.contato_campos
  for each row execute function public.trg_valor_do_campo();

-- ---------------------------------------------------------------------------
-- RLS: todos da empresa leem os campos; Admin e Gerente gravam. Os valores seguem
-- o contato: quem vê o contato lê e grava os valores dele (SUP-B38-01).
-- ---------------------------------------------------------------------------

alter table public.campos_personalizados enable row level security;
alter table public.campo_opcoes enable row level security;
alter table public.contato_campos enable row level security;

create policy "Membros veem os campos da empresa"
  on public.campos_personalizados for select
  using (workspace_id = (select public.get_auth_user_workspace_id()));

create policy "Admin e Gerente gravam campos da empresa"
  on public.campos_personalizados for all
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Membros veem as opções dos campos da empresa"
  on public.campo_opcoes for select
  using (workspace_id = (select public.get_auth_user_workspace_id()));

create policy "Admin e Gerente gravam opções dos campos da empresa"
  on public.campo_opcoes for all
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Quem vê o contato vê os valores dos campos"
  on public.contato_campos for select
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

create policy "Quem vê o contato grava os valores dos campos"
  on public.contato_campos for insert
  with check (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

create policy "Quem vê o contato muda os valores dos campos"
  on public.contato_campos for update
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id))
  with check (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

create policy "Quem vê o contato apaga os valores dos campos"
  on public.contato_campos for delete
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));
