-- B11-08: horário comercial da empresa, usado pela condição "dentro / fora do
-- horário comercial" das automações. Só cria uma tabela nova: o CRM publicado
-- não a lê e não percebe nada.
--
-- Uma linha por empresa. Sem linha, vale o padrão do código (HORARIO_PADRAO em
-- src/lib/horario-comercial.ts): segunda a sexta, das 08:00 às 18:00.
-- Uma faixa só para todos os dias marcados, como a spec pede ("dias e faixa"),
-- lida no fuso da operação (America/São Paulo).
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 10.

create table public.business_hours (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  -- 0 = domingo … 6 = sábado, como o getDay() do JavaScript
  dias smallint[] not null check (
    cardinality(dias) between 1 and 7 and dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  inicio time not null,
  fim time not null,
  updated_at timestamptz not null default now(),
  -- Sem faixa que atravesse a meia-noite
  check (inicio < fim)
);

alter table public.business_hours enable row level security;

-- Mesmas regras de acesso das automações: membros leem, admin grava.
-- O motor lê com o service client.
create policy "Membros veem o horário comercial do próprio workspace"
  on public.business_hours for select
  using (workspace_id = public.get_auth_user_workspace_id());

create policy "Admin gerencia o horário comercial do próprio workspace"
  on public.business_hours for all
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    workspace_id = public.get_auth_user_workspace_id()
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );
