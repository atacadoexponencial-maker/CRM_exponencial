create policy "Admin e Gerente criam cards no próprio workspace"
  on pipeline_cards for insert
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Membros criam contatos no próprio workspace"
  on contacts for insert
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
  );
