-- B25-02: mensagem que o vendedor mandou pelo celular (ou pelo WhatsApp Web) no
-- canal direto. Ela entra na conversa do lado da empresa, como as enviadas pelo
-- CRM, e esta coluna é o que separa as duas na tela ("Enviada pelo celular").
-- Aditiva, com padrão: as mensagens que já existem saíram todas pelo CRM.
alter table public.messages
  add column if not exists sent_from_phone boolean not null default false;
