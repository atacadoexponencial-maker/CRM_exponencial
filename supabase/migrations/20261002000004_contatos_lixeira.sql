-- B13-02: lixeira de contatos.
-- Excluir manda o contato para a lixeira (excluido_em preenchido); nada é apagado.
-- Cards, conversas e mensagens de contato na lixeira ficam invisíveis para quem lê
-- com a sessão do usuário. O próprio contato continua visível: a lixeira precisa
-- listá-lo, e as telas de contatos filtram no código.
--
-- Volta atrás:
--   alter policy "Cards visíveis por papel" on public.pipeline_cards using (<qual sem o "and not ...">);
--   (idem para conversations e messages)
--   drop function public.conversa_na_lixeira(uuid); drop function public.contato_na_lixeira(uuid);
--   alter table public.contacts drop column excluido_por, drop column excluido_em;

alter table public.contacts
  add column excluido_em timestamptz,
  add column excluido_por uuid references public.profiles(id) on delete set null;

create index contacts_lixeira_idx on public.contacts (workspace_id, excluido_em)
  where excluido_em is not null;

-- security definer: a checagem não pode depender das políticas de quem chama.
create or replace function public.contato_na_lixeira(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from contacts where id = p_contact_id and excluido_em is not null
  )
$$;

create or replace function public.conversa_na_lixeira(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversations v
    join contacts c on c.id = v.contact_id
    where v.id = p_conversation_id and c.excluido_em is not null
  )
$$;

alter policy "Cards visíveis por papel" on public.pipeline_cards
  using (
    workspace_id = (select profiles.workspace_id from profiles where profiles.id = auth.uid())
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Membros veem conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select profiles.workspace_id from profiles where profiles.id = auth.uid())
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Membros veem mensagens do próprio workspace" on public.messages
  using (
    workspace_id = (select profiles.workspace_id from profiles where profiles.id = auth.uid())
    and not public.conversa_na_lixeira(conversation_id)
  );
