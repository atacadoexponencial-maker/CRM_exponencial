create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  name text not null,
  role text not null check (role in ('admin', 'gerente', 'atendente')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Usuários veem perfis do próprio workspace"
  on profiles for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Usuários atualizam próprio perfil"
  on profiles for update
  using (id = auth.uid());
