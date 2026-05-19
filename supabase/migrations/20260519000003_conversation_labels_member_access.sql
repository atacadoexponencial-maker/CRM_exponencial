drop policy if exists "Admin gerencia vínculos de etiquetas do próprio workspace" on conversation_labels;

create policy "Membros gerenciam vínculos de etiquetas do próprio workspace"
  on conversation_labels for all
  using (
    label_id in (
      select id from labels
      where workspace_id = (select workspace_id from profiles where id = auth.uid())
    )
  );
