-- B3-01: registro do aceite do termo de responsabilidade do canal direto.
--
-- O canal direto opera fora dos Termos de Serviço do WhatsApp, e o número do
-- cliente pode ser banido. O aceite é a prova de que ele soube disso antes de
-- conectar: quem aceitou, quando, e qual versão do texto.
--
-- Uma linha por aceite, não uma por workspace: quando o texto muda, o aceite
-- antigo continua registrado (é prova do que valia então) e um novo é exigido.

create table gateway_terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id),
  -- Quem aceitou. Fica mesmo que o usuário seja removido depois: o aceite é
  -- histórico, não cadastro.
  accepted_by uuid not null references auth.users(id),
  -- Versão do texto aceito. Texto novo, versão nova, aceite novo.
  terms_version text not null,
  accepted_at timestamptz not null default now()
);

create index gateway_terms_acceptance_workspace_idx
  on gateway_terms_acceptance (workspace_id, terms_version);

alter table gateway_terms_acceptance enable row level security;

create policy "Membros veem o aceite do próprio workspace"
  on gateway_terms_acceptance for select
  using (workspace_id = (select workspace_id from profiles where id = auth.uid()));

create policy "Admins registram o aceite do próprio workspace"
  on gateway_terms_acceptance for insert
  with check (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'admin'
    and accepted_by = auth.uid()
  );

comment on table gateway_terms_acceptance is
  'Aceite do termo de responsabilidade do canal direto (B3-01). Histórico: nunca editar nem apagar linha.';
