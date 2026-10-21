-- B31-03: grade fechada — o produto só sai em pacote com quantidades fixas por opção do
-- primeiro tipo de variação (ex.: P 1, M 2, G 2, GG 1), com preço próprio opcional.
-- Colunas nulas: pode ir antes do deploy.

alter table public.catalog_products
  add column if not exists pack_quantities jsonb
    check (pack_quantities is null or jsonb_typeof(pack_quantities) = 'object'),
  add column if not exists pack_price numeric(12, 2)
    check (pack_price is null or pack_price > 0);

comment on column public.catalog_products.pack_quantities is
  'Grade fechada {"P": 1, "M": 2, "G": 2, "GG": 1} por opção do primeiro tipo; nulo = venda avulsa. O servidor confere';
comment on column public.catalog_products.pack_price is
  'Preço próprio da grade fechada; nulo = soma das peças pelo unitário';
