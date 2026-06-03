alter table contacts
  add column icp text check (icp in ('ja_revende', 'primeira_vez'));

create policy "Admin e Gerente atualizam contatos do próprio workspace"
  on contacts for update
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()))
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );
