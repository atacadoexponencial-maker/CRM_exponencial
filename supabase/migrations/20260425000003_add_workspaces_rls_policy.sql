create policy "Usuários veem próprio workspace"
  on workspaces for select
  using (id = (select workspace_id from profiles where id = auth.uid()));
