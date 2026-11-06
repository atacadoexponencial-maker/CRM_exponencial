-- B23-02: conversas antigas do WhatsApp Business do celular (coexistência).
-- Spec: pre-desenvolvimento/spec-coexistencia.md
--
-- Depois de conectar um número em uso no celular, o CRM pede à Meta a agenda e
-- o histórico (uma vez só) e acompanha o andamento aqui. A agenda fica numa
-- tabela à parte: só vira contato quem tem conversa (PER-B23-02).

alter table public.whatsapp_connections
  add column if not exists historico_situacao text
    check (historico_situacao in ('importando', 'importado', 'recusado', 'falhou')),
  add column if not exists historico_progresso integer not null default 0,
  add column if not exists historico_pedido_em timestamptz;

comment on column public.whatsapp_connections.historico_situacao is
  'B23: andamento da importação das conversas antigas do celular.';
comment on column public.whatsapp_connections.historico_progresso is
  'B23: maior progress (0-100) recebido nos webhooks history.';
comment on column public.whatsapp_connections.historico_pedido_em is
  'B23: quando o pedido smb_app_data foi feito; a Meta aceita uma vez só.';

-- A leitura pelo navegador é por coluna (20261006000004): as novas entram na lista.
grant select (historico_situacao, historico_progresso, historico_pedido_em)
  on public.whatsapp_connections to authenticated;

-- Nomes da agenda do celular, por conexão. Só o servidor lê e grava.
create table public.agenda_do_celular (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  whatsapp_connection_id uuid not null references public.whatsapp_connections(id) on delete cascade,
  phone_number text not null,
  nome text,
  created_at timestamptz not null default now(),
  unique (whatsapp_connection_id, phone_number)
);

comment on table public.agenda_do_celular is
  'B23: nomes da agenda do WhatsApp Business do celular, usados ao importar conversas antigas.';

alter table public.agenda_do_celular enable row level security;
revoke all on public.agenda_do_celular from anon, authenticated;
