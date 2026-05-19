create table labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

alter table labels enable row level security;

create policy "Membros veem etiquetas do próprio workspace"
  on labels for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admin gerencia etiquetas do próprio workspace"
  on labels for all
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
