-- QA A8 (06/10/2026): o editor mandava a grade inteira lida ao abrir, e o servidor
-- regravava tudo. Com a tela aberta, um pedido fechado (10 → 8) era desfeito ao
-- salvar a descrição (volta a 10), e cancelar o pedido inflava (12).
--
-- Agora o editor manda só as combinações que a pessoa mexeu (p_estoque) e a lista
-- das combinações que existem (p_combinacoes). O que não foi mexido fica como está
-- no banco; combinação nova nasce com 0; combinação que saiu da grade é apagada.

drop function if exists public.salvar_estoque_produto(uuid, jsonb, jsonb);

create or replace function public.salvar_estoque_produto(
  p_produto uuid,
  p_tipos jsonb,
  p_estoque jsonb,
  p_combinacoes jsonb
)
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
      and not (combination in (select jsonb_array_elements_text(p_combinacoes)));

  insert into catalog_stock (workspace_id, product_id, combination, quantity)
    select v_workspace, p_produto, c, 0
    from jsonb_array_elements_text(p_combinacoes) as c
  on conflict (product_id, combination) do nothing;

  insert into catalog_stock (workspace_id, product_id, combination, quantity)
    select v_workspace, p_produto, e.key, (e.value)::int
    from jsonb_each(p_estoque) as e
    where e.key in (select jsonb_array_elements_text(p_combinacoes))
  on conflict (product_id, combination) do update set quantity = excluded.quantity;
end;
$$;
