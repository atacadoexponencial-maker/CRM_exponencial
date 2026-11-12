-- B61-03: subcategorias do catálogo, um segundo nível dentro da categoria.

create table public.catalog_subcategories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.catalog_categories(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- O mesmo nome vale em categorias diferentes, não dentro da mesma.
create unique index catalog_subcategories_nome_unico on public.catalog_subcategories (category_id, lower(trim(name)));
create index catalog_subcategories_categoria on public.catalog_subcategories (workspace_id, category_id, position);

alter table public.catalog_products
  add column subcategory_id uuid references public.catalog_subcategories(id) on delete set null;
create index catalog_products_subcategoria on public.catalog_products (subcategory_id) where subcategory_id is not null;

alter table public.catalog_subcategories enable row level security;

-- Mesmas regras de catalog_categories: todos da empresa leem; Admin e Gerente escrevem.
create policy "Membros veem subcategorias do catálogo" on public.catalog_subcategories
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

create policy "Admin e Gerente gerenciam subcategorias" on public.catalog_subcategories
  for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

-- Sem referência entre empresas (B21): a subcategoria é da empresa da categoria, e o
-- produto só aponta para subcategoria da própria empresa.
create trigger garantir_mesma_empresa
  before insert or update of category_id, workspace_id on public.catalog_subcategories
  for each row execute function public.garantir_mesma_empresa('category_id:catalog_categories');

drop trigger if exists garantir_mesma_empresa on public.catalog_products;
create trigger garantir_mesma_empresa
  before insert or update of category_id, subcategory_id, workspace_id on public.catalog_products
  for each row execute function public.garantir_mesma_empresa('category_id:catalog_categories', 'subcategory_id:catalog_subcategories');

-- O produto nunca fica com subcategoria de outra categoria: trocar ou tirar a categoria
-- por qualquer caminho (editor, planilha, categoria apagada) zera a subcategoria.
create or replace function public.catalog_products_subcategoria_da_categoria()
  returns trigger
  language plpgsql
  set search_path = public
as $$
begin
  if new.subcategory_id is not null and not exists (
    select 1 from public.catalog_subcategories s where s.id = new.subcategory_id and s.category_id = new.category_id
  ) then
    new.subcategory_id := null;
  end if;
  return new;
end;
$$;

create trigger subcategoria_da_categoria
  before insert or update of category_id, subcategory_id on public.catalog_products
  for each row execute function public.catalog_products_subcategoria_da_categoria();
