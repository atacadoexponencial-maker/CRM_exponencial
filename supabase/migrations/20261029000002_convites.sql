-- B51-01: conta nova só por convite. Quem cuida da plataforma (não é papel de empresa)
-- cria os convites em /plataforma/convites.
--
-- As duas tabelas ficam com RLS ligado e sem política: só a chave de serviço lê e
-- grava, depois de o servidor conferir que quem pede é da plataforma.

-- Por e-mail, e não por usuário: vale antes de a conta existir no banco de teste.
create table if not exists public.plataforma_admins (
  email text primary key check (email = lower(email)),
  criado_em timestamptz not null default now()
);

alter table public.plataforma_admins enable row level security;
revoke all on public.plataforma_admins from anon, authenticated;

-- Decisão do Luan em 29/10/2026 (PER-B51-03)
insert into public.plataforma_admins (email)
values ('marcelle@seteads.com'), ('luan@seteads.com')
on conflict (email) do nothing;

-- O código do link não é guardado, só o SHA-256 dele (SUP-B51-02): quem lê o banco
-- não consegue montar um link que funcione.
create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text check (email is null or email = lower(email)),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  -- Preenchidos pelo cadastro (B51-02)
  usado_em timestamptz,
  workspace_id uuid references public.workspaces (id) on delete set null,
  cancelado_em timestamptz
);

create index if not exists convites_criado_em on public.convites (criado_em desc);

alter table public.convites enable row level security;
revoke all on public.convites from anon, authenticated;
