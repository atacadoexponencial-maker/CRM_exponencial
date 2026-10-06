-- B19-05: ninguém de fora lista os arquivos, e ninguém grava anexo do chat por fora.
--
-- Bucket público serve o arquivo pelo link sem precisar de policy. As policies de
-- SELECT para `public` só acrescentavam a LISTAGEM — que entregava a qualquer anônimo
-- as pastas `<workspace_id>/` de todas as empresas e os anexos do chat.
-- A de INSERT deixava qualquer usuário logado gravar em qualquer pasta de anexos.
--
-- Todo envio do sistema usa a service role ou URL assinada criada pelo servidor.

drop policy if exists "Leitura publica de anexos do chat" on storage.objects;
drop policy if exists "Leitura pública das imagens do catálogo" on storage.objects;
drop policy if exists "Usuarios autenticados podem fazer upload de anexos" on storage.objects;
