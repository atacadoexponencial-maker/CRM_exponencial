-- B6-04: os outros três eventos do gateway.
--
-- 1. `messages.status_error` guarda por que um envio falhou. Hoje o CRM grava
--    `status = 'falhou'` e perde o motivo, então o atendente vê que não foi e
--    não sabe dizer se o número não tem WhatsApp, se a mídia estourou o limite
--    ou se o número foi banido.
--
-- 2. `operational_alerts` é o lugar que faltava para um aviso vindo de fora.
--    A central de alertas de hoje (`src/lib/alertas.ts`) é cálculo puro sobre
--    cards de pipeline: todo alerta nasce ancorado num card, e o freio de um
--    número não tem card, nem contato, nem etapa. Sem esta tabela, o evento
--    `instance.braked` chegaria e não teria onde ser registrado.

alter table messages add column status_error text;

comment on column messages.status_error is
  'Motivo legível da falha de envio, vindo do provider (B6-04)';

create table operational_alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  -- A conexão que originou o aviso. `on delete set null`: remover o número não
  -- apaga o histórico de que ele deu problema.
  connection_id uuid references whatsapp_connections(id) on delete set null,
  -- 'numero_freado' nasce aqui; desconexão e banimento entram no B4.
  tipo text not null,
  motivo text,
  -- Quantas mensagens ficaram paradas: é o que permite avisar que uma campanha
  -- travou (B8).
  queued_count integer,
  created_at timestamptz not null default now(),
  -- Preenchido quando a condição deixa de valer (freio liberado). Alerta
  -- resolvido não vira alerta novo.
  resolved_at timestamptz
);

create index operational_alerts_abertos_idx
  on operational_alerts (workspace_id, created_at desc)
  where resolved_at is null;

-- Um aviso aberto por conexão e tipo: reentrega do mesmo evento, ou freio que
-- insiste, não enche a central de linhas repetidas.
create unique index operational_alerts_um_aberto_por_conexao_idx
  on operational_alerts (connection_id, tipo)
  where resolved_at is null;

alter table operational_alerts enable row level security;

create policy "Membros veem alertas operacionais do próprio workspace"
  on operational_alerts for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admins gerenciam alertas operacionais do próprio workspace"
  on operational_alerts for all
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
