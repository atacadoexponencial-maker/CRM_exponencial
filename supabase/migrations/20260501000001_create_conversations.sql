create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  contact_id uuid not null references contacts(id),
  status text not null default 'em_espera',
  assigned_to uuid references profiles(id),
  unread_count integer not null default 0,
  last_message_text text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "Membros veem conversas do próprio workspace"
  on conversations for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));
