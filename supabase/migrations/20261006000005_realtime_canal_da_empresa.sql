-- B19-04: o tempo real do chat passa a usar canal privado. Antes, o aviso de mensagem
-- nova (com o texto) ia num canal público `workspace:<id>`, que qualquer pessoa com a
-- anon key e o código da empresa podia ouvir — e onde podia injetar avisos falsos.
--
-- No canal privado, o Realtime só deixa entrar quem passa nesta policy: usuário logado
-- cuja empresa é a do tópico. Não há policy de INSERT: nenhum cliente transmite; só o
-- servidor, com a service role.

create policy "Membros ouvem o canal da própria empresa"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'workspace:' || (select public.get_auth_user_workspace_id())::text
  );
