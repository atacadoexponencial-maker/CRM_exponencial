-- B16-05: catálogo da loja — categorias, produtos e o bucket das imagens.
-- Só cria tabelas novas: pode ser aplicada antes do deploy.

create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create unique index catalog_categories_nome_unico on public.catalog_categories (workspace_id, lower(trim(name)));
create index catalog_categories_workspace on public.catalog_categories (workspace_id, position);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.catalog_categories(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 120),
  description text not null default '',
  price numeric(12, 2) not null check (price > 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price > price),
  sku text not null default '',
  visible boolean not null default true,
  featured boolean not null default false,
  position int not null default 0,
  -- Caminhos no bucket catalog-images, na ordem (o primeiro é a foto principal).
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index catalog_products_workspace on public.catalog_products (workspace_id, category_id, position);

alter table public.catalog_categories enable row level security;
alter table public.catalog_products enable row level security;

-- Leitura: qualquer membro da empresa (pedidos mostram produtos para todos os papéis).
create policy "Membros veem categorias do catálogo" on public.catalog_categories
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));
create policy "Membros veem produtos do catálogo" on public.catalog_products
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

-- Escrita: Admin e Gerente da própria empresa.
create policy "Admin e Gerente gerenciam categorias" on public.catalog_categories
  for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );
create policy "Admin e Gerente gerenciam produtos" on public.catalog_products
  for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

-- Imagens do catálogo: leitura pública (a vitrine abre sem login). O envio usa URL
-- assinada criada pelo servidor depois de conferir o papel; não há política de escrita
-- para usuários.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "Leitura pública das imagens do catálogo" on storage.objects
  for select to public using (bucket_id = 'catalog-images');
