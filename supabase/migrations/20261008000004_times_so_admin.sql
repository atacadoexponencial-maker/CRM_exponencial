-- B21-03: só o Admin cria, renomeia e apaga times. A policy "Admins gerenciam times"
-- só olhava a empresa — qualquer membro (Gerente, Atendente) gerenciava times pelo banco.
-- user_teams já exigia Admin. Ler os times continua liberado para a empresa toda.

alter policy "Admins gerenciam times do próprio workspace" on public.teams
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
