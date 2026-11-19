-- B61-04: limite do selo "Últimas unidades!" da vitrine. Com quantas peças ou menos, no
-- total do produto, o cartão mostra o selo. Nulo = o lojista não quer o selo.
alter table public.catalog_settings
  add column low_stock_limit smallint check (low_stock_limit between 1 and 999);
