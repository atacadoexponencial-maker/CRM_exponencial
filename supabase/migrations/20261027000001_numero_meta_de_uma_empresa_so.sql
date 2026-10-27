-- B44-01: um número da Meta pertence a uma empresa só (auditoria de 27/10/2026).
--
-- O webhook da Meta acha a empresa pelo `phone_number_id`, com `.single()`. Sem
-- unicidade, um Admin de outra empresa gravava o mesmo id (direto pela API do banco,
-- que a política "Admins gerenciam" deixava) e o `.single()` passava a falhar: as
-- mensagens do número deixavam de entrar na empresa dona. Conferido no remoto em
-- 27/10/2026: uma conexão com `phone_number_id`, nenhuma repetida.

create unique index whatsapp_connections_phone_number_id_unico
  on public.whatsapp_connections (phone_number_id)
  where phone_number_id is not null;

-- Criar e alterar conexão passa a ser só do servidor, pela chave de serviço, depois
-- de conferir empresa e papel. Ler (colunas da B19-03) e remover o próprio número
-- (política do Admin) continuam como estavam.
revoke insert, update on public.whatsapp_connections from anon, authenticated;
