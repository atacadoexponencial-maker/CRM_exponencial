create table conversation_labels (
  conversation_id uuid not null references conversations(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (conversation_id, label_id)
);

alter table conversation_labels enable row level security;

create policy "Membros veem vínculos de etiquetas do próprio workspace"
  on conversation_labels for select
  using (
    label_id in (
      select id from labels
      where workspace_id = (select workspace_id from profiles where id = auth.uid())
    )
  );

create policy "Admin gerencia vínculos de etiquetas do próprio workspace"
  on conversation_labels for all
  using (
    label_id in (
      select id from labels
      where workspace_id = (select workspace_id from profiles where id = auth.uid())
    )
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
