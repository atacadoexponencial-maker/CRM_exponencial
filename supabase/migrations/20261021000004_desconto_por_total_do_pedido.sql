-- B31-02: desconto por total de peças do pedido. A loja guarda até 3 linhas
-- "a partir de N peças, X% a menos"; o pedido guarda a porcentagem e o valor que valeram,
-- e `total` passa a ser o valor com o desconto (o que a cliente paga). A compra do contato
-- gerada ao fechar (B30-02) recebe o desconto. Colunas com padrão: pode ir antes do deploy.

alter table public.catalog_settings
  add column if not exists order_discounts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(order_discounts) = 'array' and jsonb_array_length(order_discounts) <= 3);

comment on column public.catalog_settings.order_discounts is
  'Linhas [{"min": 50, "percent": 10}] em ordem crescente; o servidor confere';

alter table public.catalog_orders
  add column if not exists discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 90),
  add column if not exists discount numeric(12, 2) not null default 0
    check (discount >= 0);

comment on column public.catalog_orders.discount is
  'Desconto do pedido em reais (B31-02). total já é o valor com o desconto.';

-- Registrar o pedido: subtotal pelos itens, desconto pela porcentagem, total com o desconto.
drop function if exists public.registrar_pedido_catalogo(uuid, uuid, text, text, jsonb);

create or replace function public.registrar_pedido_catalogo(
  p_workspace uuid,
  p_contato uuid,
  p_nome text,
  p_whatsapp text,
  p_itens jsonb,
  p_desconto_percent numeric default 0
) returns table (pedido_id uuid, numero int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero int;
  v_id uuid;
  v_pecas int;
  v_subtotal numeric(12, 2);
  v_desconto numeric(12, 2);
begin
  perform pg_advisory_xact_lock(hashtext('catalog_orders:' || p_workspace::text));
  select coalesce(max(number), 1000) + 1 into v_numero from catalog_orders where workspace_id = p_workspace;

  select sum((i->>'quantity')::int), sum((i->>'quantity')::int * (i->>'unit_price')::numeric)
    into v_pecas, v_subtotal
    from jsonb_array_elements(p_itens) as i;
  v_desconto := round(v_subtotal * coalesce(p_desconto_percent, 0) / 100, 2);

  insert into catalog_orders (workspace_id, number, contact_id, customer_name, customer_whatsapp, pieces, total, discount_percent, discount)
  values (p_workspace, v_numero, p_contato, p_nome, p_whatsapp, v_pecas, v_subtotal - v_desconto, coalesce(p_desconto_percent, 0), v_desconto)
  returning id into v_id;

  insert into catalog_order_items (order_id, product_id, product_name, combination, quantity, unit_price, photo_path, position)
  select v_id, (i->>'product_id')::uuid, i->>'product_name', coalesce(i->>'combination', ''),
         (i->>'quantity')::int, (i->>'unit_price')::numeric, i->>'photo_path', (ord - 1)::int
  from jsonb_array_elements(p_itens) with ordinality as t(i, ord);

  insert into catalog_order_events (order_id, from_status, to_status) values (v_id, null, 'novo');

  return query select v_id, v_numero;
end;
$$;

revoke execute on function public.registrar_pedido_catalogo(uuid, uuid, text, text, jsonb, numeric) from public, anon, authenticated;

-- Fechar o pedido: a compra do contato leva o desconto (valor já é o total com desconto).
create or replace function public.mudar_situacao_pedido_catalogo(p_pedido uuid, p_para text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_empresa uuid;
  v_pedido record;
  v_de text;
  v_item record;
  v_disponivel int;
  v_baixar int;
begin
  if v_quem is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  select workspace_id into v_empresa from profiles where id = v_quem and status = 'active';

  select id, status, contact_id, workspace_id, total, pieces, discount
    into v_pedido
    from catalog_orders where id = p_pedido and workspace_id = v_empresa for update;
  if v_pedido.id is null then
    raise exception 'pedido não encontrado' using errcode = 'P0002';
  end if;
  v_de := v_pedido.status;

  if not (
    (v_de = 'novo' and p_para in ('em_atendimento', 'fechado', 'cancelado')) or
    (v_de = 'em_atendimento' and p_para in ('fechado', 'cancelado')) or
    (v_de = 'fechado' and p_para in ('em_atendimento', 'cancelado'))
  ) then
    raise exception 'mudança não permitida: % → %', v_de, p_para using errcode = '22023';
  end if;

  if p_para = 'fechado' then
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

    -- B30-02: o pedido fechado vira compra do contato. B31-02: com o desconto do pedido.
    if v_pedido.contact_id is not null then
      insert into contact_purchases (contact_id, workspace_id, data, valor, pecas, desconto, atendente_id, origem, catalog_order_id)
      values (
        v_pedido.contact_id,
        v_pedido.workspace_id,
        (now() at time zone 'America/Sao_Paulo')::date,
        v_pedido.total,
        v_pedido.pieces,
        case when v_pedido.discount > 0 then v_pedido.discount else null end,
        v_quem,
        'catalogo',
        p_pedido
      )
      on conflict (catalog_order_id) where catalog_order_id is not null do nothing;
    end if;
  elsif v_de = 'fechado' then
    for v_item in
      select i.id, i.product_id, i.combination, i.estoque_baixado
      from catalog_order_items i
      where i.order_id = p_pedido and i.product_id is not null and i.estoque_baixado > 0
    loop
      update catalog_stock set quantity = least(quantity + v_item.estoque_baixado, 1000000)
        where product_id = v_item.product_id and combination = v_item.combination;
      update catalog_order_items set estoque_baixado = 0 where id = v_item.id;
    end loop;

    perform set_config('crm.pedido_catalogo', 'on', true);
    delete from contact_purchases where catalog_order_id = p_pedido;
  end if;

  update catalog_orders set status = p_para where id = p_pedido;
  insert into catalog_order_events (order_id, from_status, to_status, changed_by) values (p_pedido, v_de, p_para, v_quem);
end;
$$;

revoke execute on function public.mudar_situacao_pedido_catalogo(uuid, text) from public, anon;
grant execute on function public.mudar_situacao_pedido_catalogo(uuid, text) to authenticated;
