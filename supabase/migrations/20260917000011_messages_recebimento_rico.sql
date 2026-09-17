-- B6-03: mensagem recebida deixa de ser só texto.
--
-- `messages.type` é texto livre, sem check, então os valores novos (figurinha,
-- localizacao, contato, desconhecido) não exigem migration. O que exige são as
-- três coisas que não caberiam em `content`:
--
--  - o nome original do documento, porque `content` guarda a URL pública do
--    Storage e o nome do arquivo lá é gerado por nós;
--  - a reação, que pertence à mensagem alvo e não é mensagem nova;
--  - o apagar e o editar, que alteram uma mensagem existente. Apagada é marcada,
--    nunca removida: quem apaga no WhatsApp não apaga o histórico do CRM.

alter table messages
  add column media_mime_type text,
  add column media_filename text,
  -- Legenda de foto e video. Nullable de proposito: "sem legenda" (null) e
  -- "legenda vazia" ('') sao estados diferentes, e o contrato manda os dois.
  add column media_caption text,
  -- Emoji da reação recebida. Reação removida volta a null, em vez de virar
  -- string vazia: "sem reação" e "reagiu com nada" são estados diferentes.
  add column reaction_emoji text,
  add column edited_at timestamptz,
  add column deleted_at timestamptz;

comment on column messages.media_filename is
  'Nome original do arquivo recebido; content guarda a URL no Storage (B6-03)';
comment on column messages.deleted_at is
  'Apagada pelo remetente no WhatsApp. A linha permanece (B6-03)';
