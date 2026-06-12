-- Automações (estilo Kommo): quando <gatilho> acontece, executa <ação>.
-- Gatilhos: card entrou numa etapa do funil, nova conversa criada no WhatsApp.
-- Ações: enviar mensagem WhatsApp, aplicar etiqueta na conversa,
--        atribuir atendente, mover card para outra etapa.

create table automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  nome text not null,
  ativa boolean not null default true,
  gatilho_tipo text not null check (gatilho_tipo in ('card_movido', 'conversa_criada')),
  gatilho_config jsonb not null default '{}'::jsonb,
  acao_tipo text not null check (acao_tipo in ('enviar_mensagem', 'aplicar_etiqueta', 'atribuir_atendente', 'mover_card')),
  acao_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table automations enable row level security;

create policy "Membros veem automações do próprio workspace"
  on automations for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Admin gerencia automações do próprio workspace"
  on automations for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Movimentações feitas por automação não têm usuário responsável:
-- alterado_por nulo passa a significar "sistema/automação".
alter table pipeline_card_history alter column alterado_por drop not null;
