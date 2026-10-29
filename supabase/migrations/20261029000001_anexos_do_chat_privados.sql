-- B49-03: os anexos do chat, das campanhas e das automações deixam de abrir para quem
-- é de fora. O endereço público para de funcionar; a tela e o envio usam link assinado
-- (B49-01 e B49-02), gerado pelo servidor com a chave de serviço.
--
-- As políticas de leitura e de upload deste bucket já saíram na B19
-- (20261006000006_storage_sem_listagem.sql): sem elas, um usuário logado também não
-- lê nem lista os arquivos pela própria sessão.
--
-- Ordem de publicação: o código da B49-01 e da B49-02 vai ao ar antes desta migration.

update storage.buckets set public = false where id = 'chat-attachments';
