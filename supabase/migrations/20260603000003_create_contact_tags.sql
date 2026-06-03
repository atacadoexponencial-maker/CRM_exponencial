create table contact_tags (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  tag text not null check (tag ~ '^[^\s]+$'),
  created_at timestamptz not null default now(),
  unique (contact_id, tag)
);

alter table contact_tags enable row level security;

create policy "Membros veem tags do próprio workspace"
  on contact_tags for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Membros inserem tags no próprio workspace"
  on contact_tags for insert
  with check (workspace_id = public.get_auth_user_workspace_id());

create policy "Membros removem tags do próprio workspace"
  on contact_tags for delete
  using (workspace_id = public.get_auth_user_workspace_id());
