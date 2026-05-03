-- Bucket público para anexos do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Usuários autenticados podem fazer upload
CREATE POLICY "Usuarios autenticados podem fazer upload de anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Leitura pública (bucket já é público, política explícita para clareza)
CREATE POLICY "Leitura publica de anexos do chat"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
