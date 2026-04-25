create table teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table teams enable row level security;

create policy "Usuários veem times do próprio workspace"
  on teams for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admins gerenciam times do próprio workspace"
  on teams for all
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));
