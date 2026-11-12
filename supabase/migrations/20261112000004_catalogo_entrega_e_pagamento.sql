-- B61-06: formas de entrega e de pagamento que o lojista marca nas Configurações do
-- catálogo. Guardam os identificadores da lista pronta (src/lib/catalogo/entrega-e-pagamento.ts);
-- a loja pública mostra só o que estiver marcado. Vazio = nada aparece.
alter table public.catalog_settings
  add column delivery_methods text[] not null default '{}',
  add column payment_methods text[] not null default '{}';
