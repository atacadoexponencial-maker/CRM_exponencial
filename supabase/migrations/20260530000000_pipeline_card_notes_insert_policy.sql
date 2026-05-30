CREATE POLICY "Membros inserem notas de cards do workspace"
  ON pipeline_card_notes FOR INSERT
  WITH CHECK (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
