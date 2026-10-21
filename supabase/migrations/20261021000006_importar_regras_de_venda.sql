-- B31-04: a importação por planilha também grava as regras de venda (faixas de preço,
-- mínimo por produto e grade fechada). Sem a chave em p_dados, o produto mantém a regra.
-- Troca só a função (create or replace): pode ser aplicada antes do deploy.

create or replace function public.importar_produto_catalogo(p_produto uuid, p_dados jsonb, p_estoque jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace uuid;
  v_id uuid := p_produto;
  v_categoria uuid := nullif(p_dados->>'category_id', '')::uuid;
begin
  select workspace_id into v_workspace from profiles where id = auth.uid() and status = 'active';
  if v_workspace is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;

  if v_id is null then
    insert into catalog_products (workspace_id, category_id, name, description, price, compare_at_price, sku, visible, variant_types, photos, price_tiers, min_quantity, pack_quantities, pack_price, position)
    values (
      v_workspace,
      v_categoria,
      p_dados->>'name',
      coalesce(p_dados->>'description', ''),
      (p_dados->>'price')::numeric,
      nullif(p_dados->>'compare_at_price', '')::numeric,
      p_dados->>'sku',
      coalesce((p_dados->>'visible')::boolean, true),
      coalesce(p_dados->'variant_types', '[]'::jsonb),
      coalesce(p_dados->'photos', '[]'::jsonb),
      coalesce(p_dados->'price_tiers', '[]'::jsonb),
      nullif(p_dados->>'min_quantity', '')::int,
      case when jsonb_typeof(p_dados->'pack_quantities') = 'object' then p_dados->'pack_quantities' else null end,
      nullif(p_dados->>'pack_price', '')::numeric,
      (select coalesce(max(position), -1) + 1 from catalog_products
        where workspace_id = v_workspace and category_id is not distinct from v_categoria)
    )
    returning id into v_id;
  else
    update catalog_products set
      category_id = v_categoria,
      name = p_dados->>'name',
      description = coalesce(p_dados->>'description', ''),
      price = (p_dados->>'price')::numeric,
      compare_at_price = nullif(p_dados->>'compare_at_price', '')::numeric,
      visible = coalesce((p_dados->>'visible')::boolean, true),
      variant_types = coalesce(p_dados->'variant_types', '[]'::jsonb),
      photos = case when p_dados ? 'photos' then p_dados->'photos' else photos end,
      -- B31-04: regra só muda quando a planilha a traz.
      price_tiers = case when p_dados ? 'price_tiers' then coalesce(p_dados->'price_tiers', '[]'::jsonb) else price_tiers end,
      min_quantity = case when p_dados ? 'min_quantity' then nullif(p_dados->>'min_quantity', '')::int else min_quantity end,
      pack_quantities = case when p_dados ? 'pack_quantities' then (case when jsonb_typeof(p_dados->'pack_quantities') = 'object' then p_dados->'pack_quantities' else null end) else pack_quantities end,
      pack_price = case when p_dados ? 'pack_quantities' then nullif(p_dados->>'pack_price', '')::numeric else pack_price end,
      updated_at = now()
    where id = v_id and workspace_id = v_workspace;
    if not found then
      raise exception 'produto não encontrado' using errcode = 'P0002';
    end if;
  end if;

  insert into catalog_stock (workspace_id, product_id, combination, quantity)
    select v_workspace, v_id, e.key, (e.value)::int
    from jsonb_each(p_estoque) as e
  on conflict (product_id, combination) do update set quantity = excluded.quantity;

  return v_id;
end;
$$;

revoke execute on function public.importar_produto_catalogo(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.importar_produto_catalogo(uuid, jsonb, jsonb) to authenticated;
