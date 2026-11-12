-- B61-02: foto da categoria, mostrada no círculo da vitrine. Caminho no bucket
-- catalog-images, na pasta <empresa>/marca/. Sem foto, a loja usa a do primeiro produto.
alter table public.catalog_categories add column photo_path text;
