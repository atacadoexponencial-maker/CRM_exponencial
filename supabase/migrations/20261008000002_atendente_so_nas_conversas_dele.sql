-- B21-01: o atendente só alcança as conversas em que é o responsável — no banco, não só
-- no filtro da caixa de entrada. Admin e Gerente seguem com a empresa toda.
--
-- Antes: SELECT/UPDATE de conversations, SELECT/INSERT de messages e tudo em
-- conversation_labels liberados para qualquer membro da empresa.
--
-- Só pode ir ao banco DEPOIS do código da B21-01 no ar (transferência do atendente
-- gravada pelo servidor; alertas lendo a última atividade pelo servidor).

-- Verdadeiro se quem chama (perfil ativo) pode ver a conversa: Admin/Gerente da empresa
-- dela, ou o responsável. security definer: a checagem não pode depender das políticas
-- de quem chama (mesmo estilo de conversa_na_lixeira).
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
      and (p.role in ('admin', 'gerente') or c.assigned_to = p.id)
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
    )
  );

alter policy "Membros atualizam conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.contato_na_lixeira(contact_id)
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or assigned_to = auth.uid()
    )
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or assigned_to = auth.uid()
    )
  );

-- A RLS não compara valor antigo com novo; o trigger compara. Só vale para usuário
-- logado (auth.uid() presente): service role e o próprio banco seguem livres.
create or replace function public.conversas_campos_protegidos()
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
     or new.workspace_id is distinct from old.workspace_id
     or new.whatsapp_connection_id is distinct from old.whatsapp_connection_id then
    raise exception 'Campo da conversa não pode ser alterado' using errcode = '42501';
  end if;

  if new.assigned_to is distinct from old.assigned_to
     and coalesce((select role from profiles where id = auth.uid() and status = 'active'), '') not in ('admin', 'gerente') then
    raise exception 'Sem permissão para trocar o responsável' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists conversas_campos_protegidos on public.conversations;
create trigger conversas_campos_protegidos
  before update on public.conversations
  for each row execute function public.conversas_campos_protegidos();

-- messages ---------------------------------------------------------------------------

alter policy "Membros veem mensagens do próprio workspace" on public.messages
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.conversa_na_lixeira(conversation_id)
    and public.pode_ver_conversa(conversation_id)
  );

alter policy "Membros inserem mensagens no próprio workspace" on public.messages
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_conversa(conversation_id)
  );

-- conversation_labels ----------------------------------------------------------------

alter policy "Membros veem vínculos de etiquetas do próprio workspace" on public.conversation_labels
  using (
    label_id in (select id from public.labels where workspace_id = (select public.get_auth_user_workspace_id()))
    and public.pode_ver_conversa(conversation_id)
  );

alter policy "Membros gerenciam vínculos de etiquetas do próprio workspace" on public.conversation_labels
  using (
    label_id in (select id from public.labels where workspace_id = (select public.get_auth_user_workspace_id()))
    and public.pode_ver_conversa(conversation_id)
  )
  with check (
    label_id in (select id from public.labels where workspace_id = (select public.get_auth_user_workspace_id()))
    and public.pode_ver_conversa(conversation_id)
  );
