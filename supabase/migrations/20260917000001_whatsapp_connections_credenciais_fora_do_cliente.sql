-- B2-02: as credenciais de `whatsapp_connections` deixam de ser legíveis pelo
-- navegador.
--
-- A RLS da tabela filtra LINHAS, não colunas: um membro do workspace podia ler
-- `access_token` da conexão Meta, e passaria a ler `instance_token` do canal
-- direto — as duas credenciais que autorizam enviar mensagem em nome do
-- cliente.
--
-- O backend não é afetado: o service role ignora RLS e privilégio de coluna.
-- Quem lê pelo cliente autenticado passa a selecionar coluna a coluna; `select
-- *` nessa tabela pelo navegador passa a falhar, de propósito.

revoke select (access_token, instance_token) on whatsapp_connections from authenticated;
revoke select (access_token, instance_token) on whatsapp_connections from anon;

comment on column whatsapp_connections.instance_token is
  'Credencial da instância no gateway (X-Instance-Token). Segredo: só o backend lê.';
comment on column whatsapp_connections.access_token is
  'Credencial da conta Meta. Segredo: só o backend lê.';
