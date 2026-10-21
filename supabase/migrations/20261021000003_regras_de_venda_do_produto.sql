-- B31-01: regras de venda do produto — faixas de preço por quantidade e mínimo de peças
-- por pedido. Só colunas novas com padrão: pode ser aplicada antes do deploy.

alter table public.catalog_products
  add column if not exists price_tiers jsonb not null default '[]'::jsonb
    check (jsonb_typeof(price_tiers) = 'array' and jsonb_array_length(price_tiers) <= 3),
  add column if not exists min_quantity int
    check (min_quantity is null or min_quantity >= 1);

comment on column public.catalog_products.price_tiers is 'Faixas [{"min": 12, "price": 24.90}], em ordem crescente de min; o servidor confere';
comment on column public.catalog_products.min_quantity is 'Mínimo de peças do produto por pedido (somando as combinações); nulo = sem mínimo';
