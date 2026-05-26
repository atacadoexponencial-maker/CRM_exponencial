create table pipeline_cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  contact_id uuid not null references contacts(id),
  etapa text not null check (etapa in ('lead', 'em_qualificacao', 'catalogo_enviado', 'em_negociacao', 'primeira_compra')),
  atendente_id uuid references profiles(id),
  etapa_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table pipeline_cards enable row level security;

create policy "Cards visíveis por papel"
  on pipeline_cards for select
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

create table pipeline_card_labels (
  card_id uuid not null references pipeline_cards(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (card_id, label_id)
);

alter table pipeline_card_labels enable row level security;

create policy "Etiquetas visíveis via acesso ao card"
  on pipeline_card_labels for select
  using (
    exists (
      select 1 from pipeline_cards
      where pipeline_cards.id = card_id
    )
  );
