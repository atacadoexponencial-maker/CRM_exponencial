create table contact_purchases (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  data date not null,
  valor numeric(12, 2) not null check (valor > 0),
  created_at timestamptz not null default now()
);

alter table contact_purchases enable row level security;

create policy "Membros veem compras do próprio workspace"
  on contact_purchases for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admin e Gerente registram compras"
  on contact_purchases for insert
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );
