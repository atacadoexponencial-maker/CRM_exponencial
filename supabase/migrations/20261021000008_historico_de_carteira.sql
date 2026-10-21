-- B35-01: histórico de carteira. Uma linha por contato e por mudança de atendente do
-- contato: de quem, para quem, por quê e quem fez. A aba Carteiras lê; a ação de atribuir
-- do card, a automação e as ações da aba gravam. Tabela nova: pode ir antes do deploy.

create table public.carteira_historico (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  de_atendente_id uuid references public.profiles(id) on delete set null,
  para_atendente_id uuid references public.profiles(id) on delete set null,
  motivo text not null check (motivo in ('transferencia', 'remocao', 'distribuicao', 'ultima_venda', 'pelo_card')),
  -- Quem fez; nulo quando foi uma automação
  alterado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index carteira_historico_workspace_recente
  on public.carteira_historico (workspace_id, created_at desc);

alter table public.carteira_historico enable row level security;

-- Admin e Gerente da empresa leem e gravam; o Atendente não vê o histórico (spec B35).
-- A automação grava pelo service client, que passa por cima da RLS.
create policy "Gestores veem o histórico de carteira da empresa" on public.carteira_historico
  for select using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
  );

create policy "Gestores gravam o histórico de carteira da empresa" on public.carteira_historico
  for insert with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
    and (alterado_por is null or alterado_por = auth.uid())
  );

drop trigger if exists garantir_mesma_empresa on public.carteira_historico;
create trigger garantir_mesma_empresa
  before insert or update of contact_id, de_atendente_id, para_atendente_id, alterado_por, workspace_id on public.carteira_historico
  for each row execute function public.garantir_mesma_empresa('contact_id:contacts', 'de_atendente_id:profiles', 'para_atendente_id:profiles', 'alterado_por:profiles');
