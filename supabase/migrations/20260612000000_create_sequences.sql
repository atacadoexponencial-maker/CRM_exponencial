-- Módulo 4 — Sequências e Follow-up
-- sequences: definição (pré-definidas do método + personalizadas)
-- sequence_steps: etapas (mensagem automática ou lembrete pro vendedor)
-- sequence_runs: execução de uma sequência para um contato
-- reminders: lembretes de sequência + follow-ups avulsos (Agenda)
-- alert_config: limiares de alerta por workspace
-- alert_dismissals: alertas dispensados (não regeram até o limiar ser atingido de novo)

create table sequences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  nome text not null,
  gatilho text not null default 'manual'
    check (gatilho in ('manual', 'card_lead', 'catalogo_enviado', 'onboarding', 'inativo')),
  predefinida boolean not null default false,
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

create table sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references sequences(id) on delete cascade,
  ordem int not null,
  tipo text not null check (tipo in ('mensagem', 'lembrete')),
  prazo_dias int not null default 0 check (prazo_dias >= 0),
  conteudo text,
  instrucao text,
  created_at timestamptz not null default now()
);

create table sequence_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  sequence_id uuid not null references sequences(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  atendente_id uuid references profiles(id) on delete set null,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida', 'cancelada')),
  etapa_atual int not null default 0,
  proxima_execucao timestamptz, -- null = aguardando lembrete ser marcado como feito
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  contact_id uuid not null references contacts(id) on delete cascade,
  atendente_id uuid not null references profiles(id),
  origem text not null check (origem in ('sequencia', 'avulso')),
  sequence_run_id uuid references sequence_runs(id) on delete set null,
  instrucao text not null,
  due_at timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'feito')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table alert_config (
  workspace_id uuid primary key references workspaces(id),
  lead_sem_resposta_dias int not null default 3,
  sem_recompra_dias int not null default 30,
  em_risco_dias int not null default 7,
  inativo_dias int not null default 15
);

create table alert_dismissals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  card_id uuid not null references pipeline_cards(id) on delete cascade,
  tipo text not null,
  referencia timestamptz not null,
  created_at timestamptz not null default now(),
  unique (card_id, tipo, referencia)
);

-- ── RLS ──────────────────────────────────────────────────────────────

alter table sequences enable row level security;
alter table sequence_steps enable row level security;
alter table sequence_runs enable row level security;
alter table reminders enable row level security;
alter table alert_config enable row level security;
alter table alert_dismissals enable row level security;

-- sequences: membros leem, admin gerencia
create policy "Membros veem sequências do próprio workspace"
  on sequences for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Admin gerencia sequências do próprio workspace"
  on sequences for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- sequence_steps: acesso via sequência
create policy "Membros veem etapas de sequências do próprio workspace"
  on sequence_steps for select
  using (
    sequence_id in (select id from sequences where workspace_id = public.get_auth_user_workspace_id())
  );

create policy "Admin gerencia etapas de sequências do próprio workspace"
  on sequence_steps for all
  using (
    sequence_id in (select id from sequences where workspace_id = public.get_auth_user_workspace_id())
    and (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    sequence_id in (select id from sequences where workspace_id = public.get_auth_user_workspace_id())
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- sequence_runs: admin/gerente veem tudo; atendente vê as suas
create policy "Execuções visíveis por papel"
  on sequence_runs for select
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

create policy "Membros iniciam execuções no próprio workspace"
  on sequence_runs for insert
  with check (workspace_id = public.get_auth_user_workspace_id());

create policy "Cancelamento por papel"
  on sequence_runs for update
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

-- reminders: dono vê e edita os seus; admin/gerente veem e editam todos
create policy "Lembretes visíveis por papel"
  on reminders for select
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

create policy "Membros criam lembretes no próprio workspace"
  on reminders for insert
  with check (workspace_id = public.get_auth_user_workspace_id());

create policy "Atualização de lembretes por papel"
  on reminders for update
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

-- alert_config: membros leem, admin gerencia
create policy "Membros veem config de alertas do próprio workspace"
  on alert_config for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Admin gerencia config de alertas do próprio workspace"
  on alert_config for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from profiles where id = auth.uid()) = 'admin'
  );

-- alert_dismissals: membros do workspace leem e criam
create policy "Membros veem alertas dispensados do próprio workspace"
  on alert_dismissals for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Membros dispensam alertas do próprio workspace"
  on alert_dismissals for insert
  with check (workspace_id = public.get_auth_user_workspace_id());
