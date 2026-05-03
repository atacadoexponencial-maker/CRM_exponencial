create policy "Membros inserem mensagens no próprio workspace"
  on messages for insert
  with check (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Membros atualizam conversas do próprio workspace"
  on conversations for update
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));
