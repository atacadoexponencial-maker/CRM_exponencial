-- SONDA TEMPORÁRIA (25/10/2026): a API Oficial da Meta manda a foto de perfil do cliente
-- no webhook? Guarda a mensagem inteira que chega ao número da API Oficial da empresa
-- de teste, para ler o que a Meta envia. Sai logo depois do teste (tabela apagada).

create table public.sonda_webhook_meta (
  id uuid primary key default gen_random_uuid(),
  recebido_em timestamptz not null default now(),
  payload jsonb not null
);

alter table public.sonda_webhook_meta enable row level security;
