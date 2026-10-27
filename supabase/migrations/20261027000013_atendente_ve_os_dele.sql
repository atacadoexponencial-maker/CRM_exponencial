-- B45-03: o atendente vê os contatos e as conversas dele e os sem dono (decisão da
-- Marcelle, 27/10/2026: "fila aberta", PER-B45-04 e PER-B45-12). Admin e Gerente
-- seguem com a empresa toda.
--
-- Antes (B21-01/B21-02, 08/10): contato dele = conversa ou card com ele; a carteira
-- (contacts.atendente_id) ficava de fora. Desde a B45-02 o dono do contato é o mesmo
-- dos cards e das conversas, então a regra passa a ser só o dono.
--
-- A troca de responsável e de atendente continua bloqueada para o atendente pelos
-- triggers conversas_campos_protegidos e cards_campos_protegidos: ver não é atribuir.

create or replace function public.pode_ver_contato(p_contact_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from contacts c
    join profiles p
      on p.id = auth.uid()
     and p.status = 'active'
     and p.workspace_id = c.workspace_id
    where c.id = p_contact_id
      and (p.role in ('admin', 'gerente') or c.atendente_id = p.id or c.atendente_id is null)
  )
$$;

create or replace function public.pode_ver_conversa(p_conversation_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from conversations c
    join profiles p
      on p.id = auth.uid()
     and p.status = 'active'
     and p.workspace_id = c.workspace_id
    where c.id = p_conversation_id
      and (p.role in ('admin', 'gerente') or c.assigned_to = p.id or c.assigned_to is null)
  )
$$;

-- conversations ----------------------------------------------------------------------

alter policy "Membros veem conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.contato_na_lixeira(contact_id)
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or assigned_to = auth.uid()
      or assigned_to is null
    )
  );

alter policy "Membros atualizam conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.contato_na_lixeira(contact_id)
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or assigned_to = auth.uid()
      or assigned_to is null
    )
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or assigned_to = auth.uid()
      or assigned_to is null
    )
  );

-- pipeline_cards (leitura; PER-B45-13) -----------------------------------------------

alter policy "Cards visíveis por papel" on public.pipeline_cards
  using (
    workspace_id = (select profiles.workspace_id from profiles where profiles.id = auth.uid())
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
      or atendente_id is null
    )
    and not public.contato_na_lixeira(contact_id)
  );

-- realtime: a mensagem de conversa sem responsável chega a todos da empresa ---------

create policy "Empresa ouve as mensagens sem responsável"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'workspace:' || (select public.get_auth_user_workspace_id())::text || ':sem-responsavel'
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
  );
