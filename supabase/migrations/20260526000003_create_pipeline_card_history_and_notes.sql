CREATE TABLE IF NOT EXISTS pipeline_card_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES pipeline_cards(id) ON DELETE CASCADE,
  de_etapa text,
  para_etapa text NOT NULL,
  alterado_por uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_card_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_pipeline_card_history" ON pipeline_card_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pipeline_cards pc
      JOIN profiles p ON p.id = auth.uid()
      WHERE pc.id = pipeline_card_history.card_id
        AND pc.workspace_id = p.workspace_id
    )
  );

CREATE TABLE IF NOT EXISTS pipeline_card_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES pipeline_cards(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  texto text NOT NULL,
  autor_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_card_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_pipeline_card_notes" ON pipeline_card_notes
  FOR SELECT
  USING (
    workspace_id = (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );
