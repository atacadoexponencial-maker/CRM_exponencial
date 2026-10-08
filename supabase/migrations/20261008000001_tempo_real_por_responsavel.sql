-- B21-01: a mensagem nova (com o texto) deixa de ir para `workspace:<id>`, que todo
-- membro da empresa ouve, inclusive o atendente que não é o responsável. Passa a ir para
-- dois tópicos privados:
--   `workspace:<id>:gestao` — só Admin/Gerente ativos da empresa;
--   `usuario:<id>`          — só o próprio usuário (o responsável pela conversa).
-- A policy de `workspace:<id>` continua (eventos da lixeira e postgres_changes).
--
-- Só acrescenta: pode ir ao banco antes do código que transmite nos tópicos novos.

create policy "Gestão e responsável ouvem as mensagens novas"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (
        (select realtime.topic()) = 'workspace:' || (select public.get_auth_user_workspace_id())::text || ':gestao'
        and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      )
      or (select realtime.topic()) = 'usuario:' || (select auth.uid())::text
    )
  );
