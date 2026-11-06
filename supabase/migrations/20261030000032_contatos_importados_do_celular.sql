-- B23-03: quem apareceu numa conversa antiga importada do celular (coexistência).
-- Spec: pre-desenvolvimento/spec-coexistencia.md
--
-- No fim da importação, se o Admin marcou a opção na conexão, cada contato
-- marcado aqui que ainda não tem card no Funil de Entrada ganha um.

alter table public.contacts
  add column if not exists importado_do_celular_em timestamptz;

comment on column public.contacts.importado_do_celular_em is
  'B23: quando o contato apareceu numa conversa antiga importada do WhatsApp Business do celular.';
