-- Módulo 7 — Campanhas: disparo em massa segmentado via WhatsApp API Oficial.
-- campaigns: definição, segmentação (jsonb) e estado do envio
-- campaign_recipients: snapshot dos destinatários com status individual de entrega

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  nome text not null,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'agendada', 'enviando', 'enviada', 'cancelada')),
  segmento jsonb not null default '{}'::jsonb,
  tipo_mensagem text not null default 'texto'
    check (tipo_mensagem in ('texto', 'imagem', 'documento')),
  conteudo text,
  arquivo_url text,
  arquivo_nome text,
  agendada_para timestamptz,
  enviada_em timestamptz,
  criado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  workspace_id uuid not null references workspaces(id),
  contact_id uuid references contacts(id) on delete set null,
  nome_snapshot text,
  telefone_snapshot text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'enviado', 'entregue', 'lido', 'falhou')),
  wamid text,
  atualizado_em timestamptz,
  created_at timestamptz not null default now()
);

create index campaign_recipients_wamid_idx on campaign_recipients (wamid) where wamid is not null;
create index campaign_recipients_campaign_idx on campaign_recipients (campaign_id);

-- ── RLS ──────────────────────────────────────────────────────────────

alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;

-- Campanhas: apenas Admin e Gerente (Atendente não tem acesso ao módulo)
create policy "Admin e Gerente veem campanhas do próprio workspace"
  on campaigns for select
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Admin e Gerente gerenciam campanhas do próprio workspace"
  on campaigns for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Admin e Gerente veem destinatários do próprio workspace"
  on campaign_recipients for select
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Admin e Gerente gerenciam destinatários do próprio workspace"
  on campaign_recipients for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
  );
