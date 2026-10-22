-- B39-01: filtros da tela Pedidos aplicados no banco, sobre todos os pedidos da empresa
-- (antes a tela filtrava só os 500 mais recentes que já tinha carregado).
--
-- security definer: os filtros de cliente nova/antiga e de atendente olham contatos e
-- compras da empresa inteira, e o Atendente vê todos os pedidos da empresa (B16-10),
-- mas só os próprios contatos pela RLS. A função confere a empresa de quem chama e só
-- lê pedidos dela; devolve só as colunas do resumo que a tela já mostra.
--
-- Período em dias de Brasília: "hoje" é o dia de hoje, "7" é hoje e os 6 anteriores,
-- "30" é hoje e os 29 anteriores; o personalizado inclui o dia inicial e o final.

create or replace function public.filtrar_pedidos(
  p_filtros jsonb default '{}'::jsonb,
  p_limite int default 500,
  p_offset int default 0
)
returns table (
  id uuid,
  number int,
  created_at timestamptz,
  customer_name text,
  customer_whatsapp text,
  pieces int,
  total numeric,
  discount numeric,
  discount_percent numeric,
  status text,
  total_resultado bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_workspace uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_de date;
  v_ate date;
  v_periodo text := coalesce(p_filtros->>'periodo', '30');
  v_busca text := btrim(coalesce(p_filtros->>'busca', ''));
  v_digitos text;
  v_situacao text := nullif(p_filtros->>'situacao', '');
  v_min numeric := nullif(p_filtros->>'valorMin', '')::numeric;
  v_max numeric := nullif(p_filtros->>'valorMax', '')::numeric;
  v_produto_id uuid := nullif(p_filtros->>'produtoId', '')::uuid;
  v_produto_nome text := nullif(p_filtros->>'produtoNome', '');
  v_cliente text := nullif(p_filtros->>'cliente', '');
  v_atendente text := nullif(p_filtros->>'atendente', '');
begin
  select p.workspace_id into v_workspace
  from profiles p
  where p.id = auth.uid() and p.status = 'active';
  if v_workspace is null then
    return;
  end if;

  if v_periodo = 'hoje' then
    v_de := v_hoje; v_ate := v_hoje;
  elsif v_periodo = '7' then
    v_de := v_hoje - 6; v_ate := v_hoje;
  elsif v_periodo = '30' then
    v_de := v_hoje - 29; v_ate := v_hoje;
  elsif v_periodo = 'personalizado' then
    v_de := (p_filtros->>'de')::date;
    v_ate := (p_filtros->>'ate')::date;
    if v_de is null or v_ate is null or v_ate < v_de then
      raise exception 'Período personalizado inválido';
    end if;
  elsif v_periodo <> 'tudo' then
    raise exception 'Período desconhecido: %', v_periodo;
  end if;

  if v_situacao is not null and v_situacao not in ('novo', 'em_atendimento', 'fechado', 'cancelado') then
    raise exception 'Situação desconhecida: %', v_situacao;
  end if;
  if v_cliente is not null and v_cliente not in ('nova', 'antiga') then
    raise exception 'Cliente desconhecida: %', v_cliente;
  end if;

  v_digitos := regexp_replace(v_busca, '\D', '', 'g');

  return query
  with pedidos as (
    select o.*,
      -- Antiga: já tinha compra (de outro pedido) antes deste pedido, ou pedido fechado anterior.
      (o.contact_id is not null and (
        exists (
          select 1 from contact_purchases cp
          where cp.contact_id = o.contact_id
            and cp.catalog_order_id is distinct from o.id
            and (
              cp.data < (o.created_at at time zone 'America/Sao_Paulo')::date
              or (cp.data = (o.created_at at time zone 'America/Sao_Paulo')::date and cp.created_at < o.created_at)
            )
        )
        or exists (
          select 1 from catalog_orders o2
          where o2.contact_id = o.contact_id and o2.status = 'fechado' and o2.created_at < o.created_at
        )
      )) as ja_comprou,
      ct.atendente_id
    from catalog_orders o
    left join contacts ct on ct.id = o.contact_id
    where o.workspace_id = v_workspace
  )
  select o.id, o.number, o.created_at, o.customer_name, o.customer_whatsapp, o.pieces,
         o.total, o.discount, o.discount_percent, o.status, count(*) over ()
  from pedidos o
  where (v_de is null or (o.created_at at time zone 'America/Sao_Paulo')::date between v_de and v_ate)
    and (v_situacao is null or o.status = v_situacao)
    and (v_busca = ''
         or o.customer_name ilike '%' || replace(replace(replace(v_busca, '\', '\\'), '%', '\%'), '_', '\_') || '%'
         or (length(v_digitos) >= 3 and o.customer_whatsapp like '%' || v_digitos || '%'))
    and (v_min is null or o.total >= v_min)
    and (v_max is null or o.total <= v_max)
    and (v_produto_id is null or exists (
          select 1 from catalog_order_items i where i.order_id = o.id and i.product_id = v_produto_id))
    and (v_produto_nome is null or exists (
          select 1 from catalog_order_items i where i.order_id = o.id and i.product_id is null and i.product_name = v_produto_nome))
    and (v_cliente is null or (v_cliente = 'antiga') = o.ja_comprou)
    and (v_atendente is null
         or (v_atendente = 'sem' and o.atendente_id is null)
         or (v_atendente <> 'sem' and o.atendente_id::text = v_atendente))
  order by o.created_at desc, o.id
  limit greatest(1, least(coalesce(p_limite, 500), 500))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.filtrar_pedidos(jsonb, int, int) from public, anon;
grant execute on function public.filtrar_pedidos(jsonb, int, int) to authenticated;

-- Produtos para o filtro: os do catálogo da empresa e os nomes de itens de pedido cujo
-- produto foi apagado (product_id ficou nulo), marcados como apagados (SUP-B39-03).
create or replace function public.produtos_dos_pedidos()
returns table (id uuid, nome text, apagado boolean)
language sql
stable
security definer
set search_path = public
as $$
  with empresa as (
    select p.workspace_id from profiles p where p.id = auth.uid() and p.status = 'active'
  )
  select cp.id, cp.name, false
  from catalog_products cp
  where cp.workspace_id = (select workspace_id from empresa)
  union
  select distinct null::uuid, i.product_name, true
  from catalog_order_items i
  join catalog_orders o on o.id = i.order_id
  where o.workspace_id = (select workspace_id from empresa)
    and i.product_id is null
  order by 2, 3;
$$;

revoke execute on function public.produtos_dos_pedidos() from public, anon;
grant execute on function public.produtos_dos_pedidos() to authenticated;
