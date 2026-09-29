-- B9-03: desde quando um número do canal direto está desconectado a pedido.
--
-- Preenchido só na pausa pedida pelo admin (operação "desconectar"); limpo quando
-- o número volta a "connected". Queda de conexão não preenche: o cartão mostra
-- "tentando voltar", não "desconectado há N dias".
alter table whatsapp_connections
  add column if not exists disconnected_at timestamptz;
