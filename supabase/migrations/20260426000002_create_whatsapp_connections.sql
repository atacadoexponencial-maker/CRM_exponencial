create table whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  phone_number text not null,
  display_name text not null,
  status text not null default 'connected',
  waba_id text not null,
  phone_number_id text not null,
  access_token text not null,
  created_at timestamptz not null default now()
);

alter table whatsapp_connections enable row level security;

create policy "Membros veem conexões WhatsApp do próprio workspace"
  on whatsapp_connections for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admins gerenciam conexões WhatsApp do próprio workspace"
  on whatsapp_connections for all
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
