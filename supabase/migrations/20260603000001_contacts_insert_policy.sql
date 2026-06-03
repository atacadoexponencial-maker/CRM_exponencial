create policy "Admin e Gerente inserem contatos no próprio workspace"
  on contacts for insert
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );
