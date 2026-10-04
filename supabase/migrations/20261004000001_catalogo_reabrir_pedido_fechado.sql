-- Check-up de UX: um pedido Fechado por engano pode voltar para Em atendimento.
-- A volta devolve o estoque baixado ao fechar, igual ao cancelamento.

create or replace function public.mudar_situacao_pedido_catalogo(p_pedido uuid, p_para text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_empresa uuid;
  v_de text;
  v_item record;
  v_disponivel int;
  v_baixar int;
begin
  if v_quem is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  select workspace_id into v_empresa from profiles where id = v_quem and status = 'active';

  select status into v_de from catalog_orders where id = p_pedido and workspace_id = v_empresa for update;
  if v_de is null then
    raise exception 'pedido não encontrado' using errcode = 'P0002';
  end if;

  if not (
    (v_de = 'novo' and p_para in ('em_atendimento', 'fechado', 'cancelado')) or
    (v_de = 'em_atendimento' and p_para in ('fechado', 'cancelado')) or
    (v_de = 'fechado' and p_para in ('em_atendimento', 'cancelado'))
  ) then
    raise exception 'mudança não permitida: % → %', v_de, p_para using errcode = '22023';
  end if;

  if p_para = 'fechado' then
    -- Baixa o que houver, até zero; guarda quanto saiu de cada item.
    for v_item in
      select i.id, i.product_id, i.combination, i.quantity
      from catalog_order_items i
      where i.order_id = p_pedido and i.product_id is not null
    loop
      select quantity into v_disponivel from catalog_stock
        where product_id = v_item.product_id and combination = v_item.combination
        for update;
      if v_disponivel is not null then
        v_baixar := least(v_item.quantity, v_disponivel);
        update catalog_stock set quantity = quantity - v_baixar
          where product_id = v_item.product_id and combination = v_item.combination;
        update catalog_order_items set estoque_baixado = v_baixar where id = v_item.id;
      end if;
    end loop;
  elsif v_de = 'fechado' then
    -- Cancelar ou voltar para Em atendimento: devolve exatamente o que saiu ao fechar.
    for v_item in
      select i.id, i.product_id, i.combination, i.estoque_baixado
      from catalog_order_items i
      where i.order_id = p_pedido and i.product_id is not null and i.estoque_baixado > 0
    loop
      update catalog_stock set quantity = least(quantity + v_item.estoque_baixado, 1000000)
        where product_id = v_item.product_id and combination = v_item.combination;
      update catalog_order_items set estoque_baixado = 0 where id = v_item.id;
    end loop;
  end if;

  update catalog_orders set status = p_para where id = p_pedido;
  insert into catalog_order_events (order_id, from_status, to_status, changed_by) values (p_pedido, v_de, p_para, v_quem);
end;
$$;

revoke execute on function public.mudar_situacao_pedido_catalogo(uuid, text) from public, anon;
grant execute on function public.mudar_situacao_pedido_catalogo(uuid, text) to authenticated;
