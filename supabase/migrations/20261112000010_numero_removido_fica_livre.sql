-- B23-06 (SUP-B23-18): remover um número o deixa livre para qualquer empresa.
--
-- A conexão removida continua no banco, porque as conversas apontam para ela, mas
-- deixa de reservar o número: o índice único da B44-01 (um número da Meta é de uma
-- empresa só) passa a valer apenas para conexão que não foi removida. Quem quer
-- guardar o número para a própria empresa usa "Desconectar", que não muda nada aqui.

drop index if exists public.whatsapp_connections_phone_number_id_unico;

create unique index whatsapp_connections_phone_number_id_unico
  on public.whatsapp_connections (phone_number_id)
  where phone_number_id is not null and status <> 'removed';
