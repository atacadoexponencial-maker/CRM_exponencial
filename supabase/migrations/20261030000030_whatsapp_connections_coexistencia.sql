-- B23-01: número da API Oficial que continua em uso no WhatsApp Business do celular
-- (coexistência). Spec: pre-desenvolvimento/spec-coexistencia.md
--
-- `em_uso_no_celular` vem do campo `is_on_biz_app` da Meta na hora da conexão.
-- `criar_cards_do_historico` é a escolha do Admin antes de conectar: os contatos
-- das conversas antigas ganham card no Funil de Entrada (lida na B23-03).

alter table public.whatsapp_connections
  add column if not exists em_uso_no_celular boolean not null default false,
  add column if not exists criar_cards_do_historico boolean not null default false;

comment on column public.whatsapp_connections.em_uso_no_celular is
  'B23: o número continua em uso no WhatsApp Business do celular (is_on_biz_app da Meta).';
comment on column public.whatsapp_connections.criar_cards_do_historico is
  'B23: escolha do Admin na conexão — contatos das conversas antigas ganham card no Funil de Entrada.';

-- A leitura pelo navegador é por coluna (20261006000004): as novas entram na lista.
grant select (em_uso_no_celular, criar_cards_do_historico)
  on public.whatsapp_connections to authenticated;
