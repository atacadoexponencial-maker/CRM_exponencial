-- B21-02: o atendente só alcança os contatos e cards dele — no banco, não só na lista.
-- "Contato dele" = tem conversa em que ele é o responsável ou card em que ele é o
-- atendente (mesma regra de listarContatos). Admin e Gerente seguem com a empresa toda.
--
-- Cards: o SELECT já era por papel (e o histórico herda). Aqui fecham contatos, tags,
-- compras, notas, a alteração de card, lembretes e execuções de sequência.

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
      and (
        p.role in ('admin', 'gerente')
        or exists (select 1 from conversations v where v.contact_id = c.id and v.assigned_to = p.id)
        or exists (select 1 from pipeline_cards k where k.contact_id = c.id and k.atendente_id = p.id)
      )
  )
$$;

-- contacts ---------------------------------------------------------------------------

alter policy "Membros veem contatos do próprio workspace" on public.contacts
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or public.pode_ver_contato(id)
    )
  );

-- Fica só "Admin e Gerente inserem contatos": o CRM não deixa atendente criar contato.
drop policy if exists "Membros criam contatos no próprio workspace" on public.contacts;

-- contact_tags e contact_purchases ---------------------------------------------------

alter policy "Membros veem tags do próprio workspace" on public.contact_tags
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

alter policy "Membros inserem tags no próprio workspace" on public.contact_tags
  with check (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

alter policy "Membros removem tags do próprio workspace" on public.contact_tags
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

alter policy "Membros veem compras do próprio workspace" on public.contact_purchases
  using (workspace_id = (select public.get_auth_user_workspace_id()) and public.pode_ver_contato(contact_id));

-- pipeline_card_notes: só de card visível (o SELECT de pipeline_cards já é por papel) --

alter policy "select_pipeline_card_notes" on public.pipeline_card_notes
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and exists (select 1 from public.pipeline_cards k where k.id = pipeline_card_notes.card_id)
  );

alter policy "Membros inserem notas de cards do workspace" on public.pipeline_card_notes
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and autor_id = auth.uid()
    and exists (
      select 1 from public.pipeline_cards k
      where k.id = pipeline_card_notes.card_id and k.workspace_id = pipeline_card_notes.workspace_id
    )
  );

-- pipeline_cards ---------------------------------------------------------------------

alter policy "Membros atualizam etapa dos cards do workspace" on public.pipeline_cards
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

create or replace function public.cards_campos_protegidos()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.contact_id is distinct from old.contact_id
     or new.workspace_id is distinct from old.workspace_id then
    raise exception 'Campo do card não pode ser alterado' using errcode = '42501';
  end if;

  if new.atendente_id is distinct from old.atendente_id
     and coalesce((select role from profiles where id = auth.uid() and status = 'active'), '') not in ('admin', 'gerente') then
    raise exception 'Sem permissão para trocar o atendente' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists cards_campos_protegidos on public.pipeline_cards;
create trigger cards_campos_protegidos
  before update on public.pipeline_cards
  for each row execute function public.cards_campos_protegidos();

-- reminders e sequence_runs ----------------------------------------------------------

alter policy "Membros criam lembretes no próprio workspace" on public.reminders
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or (atendente_id = auth.uid() and public.pode_ver_contato(contact_id))
    )
  );

alter policy "Atualização de lembretes por papel" on public.reminders
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );

alter policy "Membros iniciam execuções no próprio workspace" on public.sequence_runs
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or (atendente_id = auth.uid() and public.pode_ver_contato(contact_id))
    )
  );

alter policy "Cancelamento por papel" on public.sequence_runs
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );
