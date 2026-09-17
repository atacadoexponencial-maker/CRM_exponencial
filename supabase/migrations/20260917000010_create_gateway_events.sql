-- B6-01: registro dos eventos que o gateway já entregou.
--
-- O gateway reenvia o mesmo evento, com o mesmo event_id, sempre que o CRM não
-- responde 2xx (A7-03). Sem este registro, uma reentrega criaria a mensagem
-- duas vezes na conversa.
--
-- processed_at separa "chegou" de "processado até o fim": se o processo morrer
-- no meio, a linha fica com processed_at nulo e a reentrega seguinte processa
-- de novo, em vez de dar o evento por feito e perdê-lo.

create table gateway_events (
  event_id text primary key,
  type text not null,
  instance_id text not null,
  workspace_id uuid not null references workspaces(id),
  -- Momento do fato, informado pelo gateway; não é o da chegada.
  event_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index gateway_events_instance_idx on gateway_events (instance_id, received_at desc);

alter table gateway_events enable row level security;

-- Ninguém no navegador precisa ler isto: quem escreve e lê é o backend, com a
-- service role, que não passa por RLS. Sem policy de select, a tabela fica
-- fechada para os clientes — o mais restritivo que serve.
create policy "Admins veem eventos do gateway do próprio workspace"
  on gateway_events for select
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );
