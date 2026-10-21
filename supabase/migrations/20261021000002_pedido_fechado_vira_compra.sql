-- B30-02: pedido do catálogo marcado como Fechado vira compra do contato; sair de Fechado
-- (voltar para Em atendimento ou cancelar) desfaz a compra. Compra de origem "catálogo"
-- não se edita nem se apaga por fora do pedido. Pedidos já Fechados ganham a compra uma vez.

-- 1. Ligação compra ↔ pedido ---------------------------------------------------------

alter table public.contact_purchases
  add column if not exists catalog_order_id uuid references public.catalog_orders(id) on delete cascade;

-- Uma compra por pedido, no máximo.
create unique index if not exists contact_purchases_catalog_order_uq
  on public.contact_purchases (catalog_order_id)
  where catalog_order_id is not null;

-- Origem "catalogo" anda junto com o pedido: um sem o outro não existe.
alter table public.contact_purchases
  drop constraint if exists contact_purchases_origem_catalogo_com_pedido;
alter table public.contact_purchases
  add constraint contact_purchases_origem_catalogo_com_pedido
  check ((origem = 'catalogo') = (catalog_order_id is not null));

comment on column public.contact_purchases.catalog_order_id is
  'B30-02: pedido do catálogo que gerou a compra (origem = catalogo). Nulo nas demais origens.';

-- 2. Compra do catálogo só muda pelo pedido --------------------------------------------
-- A função de situação do pedido liga a chave da transação antes de apagar.

create or replace function public.compra_do_catalogo_so_pelo_pedido()
returns trigger
language plpgsql
as $$
begin
  if old.origem = 'catalogo' and current_setting('crm.pedido_catalogo', true) is distinct from 'on' then
    raise exception 'compra do catálogo só muda pelo pedido' using errcode = 'P0010';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists compra_do_catalogo_so_pelo_pedido on public.contact_purchases;
create trigger compra_do_catalogo_so_pelo_pedido
  before update or delete on public.contact_purchases
  for each row execute function public.compra_do_catalogo_so_pelo_pedido();

-- 3. Mudar a situação do pedido: agora também cria e desfaz a compra ---------------------
-- Mesma transação do estoque (B16-11) e da volta para Em atendimento.

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

  select id, status, contact_id, workspace_id, total, pieces
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

    -- B30-02: o pedido fechado vira compra do contato. Data = dia do fechamento em Brasília;
    -- atendente = quem fechou. Pedido sem contato fecha sem compra.
    if v_pedido.contact_id is not null then
      insert into contact_purchases (contact_id, workspace_id, data, valor, pecas, atendente_id, origem, catalog_order_id)
      values (
        v_pedido.contact_id,
        v_pedido.workspace_id,
        (now() at time zone 'America/Sao_Paulo')::date,
        v_pedido.total,
        v_pedido.pieces,
        v_quem,
        'catalogo',
        p_pedido
      )
      on conflict (catalog_order_id) where catalog_order_id is not null do nothing;
    end if;
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

    -- B30-02: e desfaz a compra gerada pelo fechamento.
    perform set_config('crm.pedido_catalogo', 'on', true);
    delete from contact_purchases where catalog_order_id = p_pedido;
  end if;

  update catalog_orders set status = p_para where id = p_pedido;
  insert into catalog_order_events (order_id, from_status, to_status, changed_by) values (p_pedido, v_de, p_para, v_quem);
end;
$$;

revoke execute on function public.mudar_situacao_pedido_catalogo(uuid, text) from public, anon;
grant execute on function public.mudar_situacao_pedido_catalogo(uuid, text) to authenticated;

-- 4. Retroativo: pedidos já Fechados, com contato e sem compra ----------------------------
-- Data = dia (Brasília) do último evento "→ fechado" do histórico; sem atendente, porque
-- não dá para saber quem fechou na época (PER-B30-01). Idempotente: só roda a função de
-- serviço; não é para a aplicação chamar.

create or replace function public.gerar_compras_de_pedidos_fechados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_criadas integer;
begin
  with fechamento as (
    select e.order_id, max(e.created_at) as em
    from catalog_order_events e
    where e.to_status = 'fechado'
    group by e.order_id
  ),
  inseridas as (
    insert into contact_purchases (contact_id, workspace_id, data, valor, pecas, atendente_id, origem, catalog_order_id, created_at)
    select
      o.contact_id,
      o.workspace_id,
      (coalesce(f.em, o.created_at) at time zone 'America/Sao_Paulo')::date,
      o.total,
      o.pieces,
      null,
      'catalogo',
      o.id,
      coalesce(f.em, o.created_at)
    from catalog_orders o
    left join fechamento f on f.order_id = o.id
    where o.status = 'fechado'
      and o.contact_id is not null
      and not exists (select 1 from contact_purchases p where p.catalog_order_id = o.id)
    on conflict (catalog_order_id) where catalog_order_id is not null do nothing
    returning 1
  )
  select count(*) into v_criadas from inseridas;
  return v_criadas;
end;
$$;

revoke execute on function public.gerar_compras_de_pedidos_fechados() from public, anon, authenticated;
grant execute on function public.gerar_compras_de_pedidos_fechados() to service_role;

select public.gerar_compras_de_pedidos_fechados();
