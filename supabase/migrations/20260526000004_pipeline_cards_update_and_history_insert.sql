CREATE POLICY "Membros atualizam etapa dos cards do workspace"
  ON pipeline_cards FOR UPDATE
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Membros inserem histórico de cards do workspace"
  ON pipeline_card_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pipeline_cards pc
      JOIN profiles p ON p.id = auth.uid()
      WHERE pc.id = pipeline_card_history.card_id
        AND pc.workspace_id = p.workspace_id
    )
  );
