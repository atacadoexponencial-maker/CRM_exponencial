-- B16-07: configurações do catálogo (endereço da loja, número que recebe os pedidos,
-- pedido mínimo, mensagem de fechamento, publicação). Uma linha por empresa.
-- Só cria tabela nova: pode ir antes do deploy.

create table public.catalog_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  slug text check (slug is null or slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  whatsapp_connection_id uuid references public.whatsapp_connections(id) on delete set null,
  min_type text not null default 'nenhum' check (min_type in ('nenhum', 'pecas', 'valor')),
  min_value numeric(12, 2) check (min_value is null or min_value > 0),
  closing_message text not null default '' check (length(closing_message) <= 500),
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  check (min_type = 'nenhum' or min_value is not null),
  check (not published or (slug is not null and whatsapp_connection_id is not null))
);

create unique index catalog_settings_slug_unico on public.catalog_settings (lower(slug)) where slug is not null;

alter table public.catalog_settings enable row level security;

create policy "Membros veem as configurações do catálogo" on public.catalog_settings
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

create policy "Admin e Gerente gerenciam as configurações do catálogo" on public.catalog_settings
  for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );
