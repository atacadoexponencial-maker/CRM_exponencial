create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  phone_number text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (workspace_id, phone_number)
);

alter table contacts enable row level security;

create policy "Membros veem contatos do próprio workspace"
  on contacts for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));
