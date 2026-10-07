-- B11-03: histórico de execuções das automações e proteção contra disparo repetido.
-- Só acrescenta: uma coluna na tabela da B11-02 e uma tabela nova, que o CRM
-- publicado não conhece.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 8.

-- Proteção de repetição da regra: { "modo": "sempre" | "uma_vez_por_contato" |
-- "a_cada_horas", "horas": N }. O formato é conferido no servidor (lerRepeticao).
alter table public.automation_flows
  add column repeticao jsonb not null default '{"modo":"sempre"}'::jsonb
    check (repeticao ->> 'modo' in ('sempre', 'uma_vez_por_contato', 'a_cada_horas'));

-- Uma linha por avaliação de regra que chegou a percorrer o fluxo ou foi barrada
-- pela proteção. Guarda cópias (nome, evento, blocos percorridos) para a execução
-- continuar legível depois que a regra muda ou é excluída.
create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- automation_flows.id ou automations.id (regra antiga); sem fk: a regra pode
  -- ser excluída, e o histórico dela fica
  regra_id uuid not null,
  regra_origem text not null check (regra_origem in ('fluxo', 'antiga')),
  regra_nome text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  -- O gatilho que aconteceu: { tipo, funil?, etapa?, cardId?, conversationId? }
  evento jsonb not null,
  resultado text not null check (resultado in ('concluida', 'falhou', 'ignorada')),
  -- Por que foi ignorada, ou o erro que encerrou a regra
  motivo text,
  -- [{ bloco: <cópia do bloco>, saida?: "sim" | "nao", ok?: boolean, motivo?: text }]
  caminho jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index automation_runs_workspace_data
  on public.automation_runs (workspace_id, created_at desc);

-- A proteção de repetição procura a última execução da regra para o contato
create index automation_runs_protecao
  on public.automation_runs (regra_id, contact_id, created_at desc)
  where resultado <> 'ignorada';

alter table public.automation_runs enable row level security;

-- A página de histórico é só do admin. Quem grava é o motor, com o service client.
create policy "Admin vê o histórico de automações do próprio workspace"
  on public.automation_runs for select
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
