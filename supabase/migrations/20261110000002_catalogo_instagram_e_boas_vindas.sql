-- B61-01: topo novo da loja pública.
-- Instagram da loja (sem o @) e texto de boas-vindas mais longo, para servir de bio.
-- Um comando só, que pode rodar mais de uma vez sem erro.

alter table public.catalog_settings
  add column if not exists instagram text,
  drop constraint if exists catalog_settings_instagram_check,
  add constraint catalog_settings_instagram_check check (instagram ~ '^[a-z0-9._]{1,30}$'),
  drop constraint if exists catalog_settings_welcome_text_check,
  add constraint catalog_settings_welcome_text_check check (length(welcome_text) <= 300);
