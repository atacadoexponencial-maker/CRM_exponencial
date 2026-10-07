-- B16-09: pedidos que as clientes fazem pela vitrine. Só cria tabelas e a função.

create table public.catalog_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  number int not null,
  contact_id uuid references public.contacts(id) on delete set null,
  customer_name text not null check (length(trim(customer_name)) between 1 and 80),
  customer_whatsapp text not null check (customer_whatsapp ~ '^55[0-9]{10,11}$'),
  status text not null default 'novo' check (status in ('novo', 'em_atendimento', 'fechado', 'cancelado')),
  pieces int not null check (pieces > 0),
  total numeric(12, 2) not null check (total > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, number)
);

create index catalog_orders_workspace on public.catalog_orders (workspace_id, created_at desc);
create index catalog_orders_contato on public.catalog_orders (contact_id);
create index catalog_orders_whatsapp on public.catalog_orders (workspace_id, customer_whatsapp, created_at desc);

create table public.catalog_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.catalog_orders(id) on delete cascade,
  product_id uuid references public.catalog_products(id) on delete set null,
  -- Nome, variação, preço e foto da época: o pedido não muda se o produto mudar depois.
  product_name text not null,
  combination text not null default '',
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price > 0),
  photo_path text,
  position int not null default 0
);

create index catalog_order_items_pedido on public.catalog_order_items (order_id, position);

create table public.catalog_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.catalog_orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  -- Nulo = feito pela loja (o pedido chegando); senão, quem mudou a situação.
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index catalog_order_events_pedido on public.catalog_order_events (order_id, created_at);

alter table public.catalog_orders enable row level security;
alter table public.catalog_order_items enable row level security;
alter table public.catalog_order_events enable row level security;

-- Leitura: todos os papéis da empresa (pedidos são de todo o time).
create policy "Membros veem os pedidos do catálogo" on public.catalog_orders
  for select using (workspace_id = (select workspace_id from public.profiles where id = auth.uid()));
create policy "Membros veem os itens dos pedidos" on public.catalog_order_items
  for select using (exists (
    select 1 from public.catalog_orders o
    where o.id = order_id and o.workspace_id = (select workspace_id from public.profiles where id = auth.uid())
  ));
create policy "Membros veem o histórico dos pedidos" on public.catalog_order_events
  for select using (exists (
    select 1 from public.catalog_orders o
    where o.id = order_id and o.workspace_id = (select workspace_id from public.profiles where id = auth.uid())
  ));

-- Registro do pedido: numeração sequencial por empresa, com trava para dois pedidos ao
-- mesmo tempo não pegarem o mesmo número. Chamada só pelo servidor (chave de serviço),
-- depois de conferir loja, produtos, estoque e mínimo. p_itens: lista de
-- { product_id, product_name, combination, quantity, unit_price, photo_path }.
create or replace function public.registrar_pedido_catalogo(
  p_workspace uuid,
  p_contato uuid,
  p_nome text,
  p_whatsapp text,
  p_itens jsonb
) returns table (pedido_id uuid, numero int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_numero int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('catalog_orders:' || p_workspace::text));
  select coalesce(max(number), 1000) + 1 into v_numero from catalog_orders where workspace_id = p_workspace;

  insert into catalog_orders (workspace_id, number, contact_id, customer_name, customer_whatsapp, pieces, total)
  select p_workspace, v_numero, p_contato, p_nome, p_whatsapp,
         sum((i->>'quantity')::int), sum((i->>'quantity')::int * (i->>'unit_price')::numeric)
  from jsonb_array_elements(p_itens) as i
  returning id into v_id;

  insert into catalog_order_items (order_id, product_id, product_name, combination, quantity, unit_price, photo_path, position)
  select v_id, (i->>'product_id')::uuid, i->>'product_name', coalesce(i->>'combination', ''),
         (i->>'quantity')::int, (i->>'unit_price')::numeric, i->>'photo_path', (ord - 1)::int
  from jsonb_array_elements(p_itens) with ordinality as t(i, ord);

  insert into catalog_order_events (order_id, from_status, to_status) values (v_id, null, 'novo');

  return query select v_id, v_numero;
end;
$$;

-- Só o servidor (service_role) registra pedido.
revoke execute on function public.registrar_pedido_catalogo(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
