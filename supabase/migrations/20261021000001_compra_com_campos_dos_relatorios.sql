-- B30-01: a compra do contato ganha os campos que os relatórios precisam.
-- Tudo opcional; as compras antigas continuam valendo como "manual".
-- O vínculo com o pedido do catálogo (pedido_id) entra na B30-02.

alter table public.contact_purchases
  add column if not exists pecas integer
    check (pecas is null or pecas >= 0),
  add column if not exists desconto numeric(12, 2)
    check (desconto is null or desconto >= 0),
  add column if not exists forma_pagamento text
    check (forma_pagamento is null or forma_pagamento in (
      'pix', 'boleto', 'cartao_credito', 'cartao_debito',
      'transferencia', 'dinheiro', 'cheque', 'outro'
    )),
  add column if not exists atendente_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists origem text not null default 'manual'
    check (origem in ('manual', 'catalogo', 'externa')),
  add column if not exists codigo_externo text;

create index if not exists contact_purchases_atendente_id_idx
  on public.contact_purchases (atendente_id);

comment on column public.contact_purchases.desconto is
  'Informativo, em reais. Nunca é subtraído de valor: valor já é o que o cliente pagou.';
comment on column public.contact_purchases.codigo_externo is
  'Identificador do pedido num sistema de fora (ERP). Reservado; nenhuma tela mostra ainda.';
