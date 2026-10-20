-- Prévia do documento recebido (pedido dela em 20/10/2026): o WhatsApp manda a
-- miniatura do PDF dentro da mensagem; o gateway a expõe em `media.thumbnail_url`
-- e o CRM a guarda no próprio Storage, ao lado do arquivo. Só acrescenta coluna.
alter table public.messages add column if not exists media_thumbnail_url text;
