create table if not exists public.quick_replies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.quick_replies enable row level security;

-- Todos os membros do workspace podem visualizar
create policy "Membros veem mensagens rápidas do workspace"
  on public.quick_replies for select
  using (
    workspace_id in (
      select workspace_id from public.profiles where id = auth.uid()
    )
  );

-- Apenas admin pode gerenciar
create policy "Admin gerencia mensagens rápidas"
  on public.quick_replies for all
  using (
    workspace_id in (
      select workspace_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    workspace_id in (
      select workspace_id from public.profiles where id = auth.uid() and role = 'admin'
    )
  );
