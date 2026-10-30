-- B53-10: "Dados editados" na timeline do contato (roteiro de QA do Luan).
--
-- Uma linha por Salvar que mudou alguma coisa: quem editou e os nomes dos campos
-- que mudaram (nome, tipo, cidade, UF, ICP, observações e campos personalizados;
-- SUP-B53-04). Os valores antigos não ficam guardados.
-- Spec: pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md

create table public.contato_edicoes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  campos text[] not null,
  created_at timestamptz not null default now(),
  constraint contato_edicoes_campos check (cardinality(campos) between 1 and 60)
);

create index contato_edicoes_contato on public.contato_edicoes (contact_id, created_at desc);

-- O contato precisa ser da mesma empresa da linha
create or replace function public.trg_edicao_do_contato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from contacts where id = new.contact_id and workspace_id = new.workspace_id) then
    raise exception 'Contato de outra empresa.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger edicao_do_contato
  before insert on public.contato_edicoes
  for each row execute function public.trg_edicao_do_contato();

alter table public.contato_edicoes enable row level security;

create policy "Quem vê o contato vê as edições"
  on public.contato_edicoes for select
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

-- Só grava em nome próprio; não há update nem delete: o registro não muda
create policy "Quem vê o contato registra a própria edição"
  on public.contato_edicoes for insert
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_contato(contact_id)
    and autor_id = auth.uid()
  );
