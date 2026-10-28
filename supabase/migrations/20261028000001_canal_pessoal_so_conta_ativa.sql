-- B47-02: o canal pessoal de tempo real (`usuario:<id>`) passa a exigir conta ativa,
-- como o canal da empresa (via get_auth_user_workspace_id) e o da fila aberta (B45-03).
-- Antes, um atendente desativado com o acesso ainda válido continuava recebendo as
-- mensagens novas das conversas dele.

drop policy if exists "Gestão e responsável ouvem as mensagens novas" on realtime.messages;

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
      or (
        (select realtime.topic()) = 'usuario:' || (select auth.uid())::text
        and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
      )
    )
  );
