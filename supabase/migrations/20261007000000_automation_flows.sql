-- B11-02: regras de automação em fluxo de blocos (gatilho, condições, ações).
-- Só cria uma tabela nova: pode ser aplicada antes do deploy, e o CRM publicado,
-- que lê `automations`, não percebe nada.
--
-- As regras antigas continuam em `automations`, intactas. O motor novo monta o
-- fluxo delas na hora (gatilho → ação); a cópia para esta tabela é feita uma vez,
-- na limpeza depois do merge do branch b11-automacoes-v2, com o mesmo id.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 5.

create table public.automation_flows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 120),
  ativa boolean not null default true,
  -- O desenho inteiro, no formato do tipo `Fluxo` de src/lib/fluxo-automacao.ts:
  -- { "blocos": [...], "ligacoes": [...] }. A validação de verdade é a das funções
  -- de lá; aqui só se garante que as duas listas existem.
  fluxo jsonb not null check (
    jsonb_typeof(fluxo -> 'blocos') = 'array' and jsonb_typeof(fluxo -> 'ligacoes') = 'array'
  ),
  -- Tirado do bloco de gatilho, para o motor buscar só as regras do evento que
  -- aconteceu. Gerada: não tem como ficar diferente do fluxo, e fluxo sem gatilho
  -- é recusado pelo not null.
  gatilho_tipo text not null generated always as (
    jsonb_path_query_first(fluxo, '$.blocos[*] ? (@.tipo == "gatilho").gatilho') #>> '{}'
  ) stored check (
    gatilho_tipo in (
      'mensagem_recebida',
      'mensagem_enviada_time',
      'conversa_criada',
      'card_movido',
      'tag_adicionada',
      'etiqueta_aplicada',
      'dado_contato_alterado'
    )
  ),
  created_at timestamptz not null default now()
);

create index automation_flows_gatilho_ativas
  on public.automation_flows (workspace_id, gatilho_tipo)
  where ativa;

alter table public.automation_flows enable row level security;

-- Mesmas regras de acesso de `automations`: membros leem, admin grava.
-- O motor roda com o service client.
create policy "Membros veem fluxos de automação do próprio workspace"
  on public.automation_flows for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Admin gerencia fluxos de automação do próprio workspace"
  on public.automation_flows for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
