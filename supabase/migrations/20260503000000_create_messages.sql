create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id),
  workspace_id uuid not null references workspaces(id),
  direction text not null,
  type text not null default 'texto',
  content text not null default '',
  status text,
  reply_to_id uuid references messages(id),
  reply_preview_text text,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Membros veem mensagens do próprio workspace"
  on messages for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));
