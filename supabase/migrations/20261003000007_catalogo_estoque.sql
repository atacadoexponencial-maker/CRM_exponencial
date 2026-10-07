-- B16-06: variações e estoque por combinação. Só acrescenta: pode ir antes do deploy.

alter table public.catalog_products
  add column variant_types jsonb not null default '[]'::jsonb
    check (jsonb_typeof(variant_types) = 'array' and jsonb_array_length(variant_types) <= 2);

create table public.catalog_stock (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid not null references public.catalog_products(id) on delete cascade,
  -- Combinação das opções, ex.: "M / Azul"; "" quando o produto não tem variação.
  combination text not null,
  quantity int not null default 0 check (quantity >= 0 and quantity <= 1000000),
  primary key (product_id, combination)
);

create index catalog_stock_workspace on public.catalog_stock (workspace_id);

alter table public.catalog_stock enable row level security;

create policy "Membros veem o estoque do catálogo" on public.catalog_stock
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));

create policy "Admin e Gerente gerenciam o estoque" on public.catalog_stock
  for all
  using (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = (select workspace_id from public.profiles where id = auth.uid())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

-- Grava tipos e estoque do produto numa transação só. security invoker: as linhas passam
-- pelo RLS de quem chama (Admin/Gerente da empresa do produto).
-- p_estoque: objeto { "combinação": quantidade }, só com as combinações que existem hoje.
create or replace function public.salvar_estoque_produto(p_produto uuid, p_tipos jsonb, p_estoque jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace uuid;
begin
  update catalog_products set variant_types = p_tipos, updated_at = now()
    where id = p_produto
    returning workspace_id into v_workspace;
  if v_workspace is null then
    raise exception 'produto não encontrado' using errcode = 'P0002';
  end if;

  delete from catalog_stock
    where product_id = p_produto
      and not (combination in (select jsonb_object_keys(p_estoque)));

  insert into catalog_stock (workspace_id, product_id, combination, quantity)
    select v_workspace, p_produto, e.key, (e.value)::int
    from jsonb_each(p_estoque) as e
  on conflict (product_id, combination) do update set quantity = excluded.quantity;
end;
$$;
