-- B63-01: o que Atendente e Gerente veem passa a ser escolha da empresa (decisão do
-- Luan, 19/11/2026). Três alcances, a mesma escolha para conversas, contatos e cards:
--   'atribuidos'             — só o que tem a pessoa como dona;
--   'atribuidos_e_sem_dono'  — o dela e o sem dono (a "fila aberta" da B45-03);
--   'todos'                  — a empresa toda.
-- O Admin vê sempre tudo. Padrão: Atendente em 'atribuidos', Gerente em 'todos'; as
-- empresas que já existem recebem o padrão (SUP-B63-05).
--
-- Ver dá direito a atender: quem vê a conversa ou o card pode responder e mover.
-- Trocar o dono continua bloqueado para o atendente pelos gatilhos
-- conversas_campos_protegidos e cards_campos_protegidos (SUP-B63-06).
--
-- Volta atrás: rodar de novo as definições de 20261027000013_atendente_ve_os_dele.sql
-- e 20261028000001_canal_pessoal_so_conta_ativa.sql, a policy de contatos de
-- 20261008000003 e a de update dos cards anterior; depois apagar as duas colunas e
-- as duas funções novas.

-- 1. A escolha da empresa ------------------------------------------------------------

alter table public.workspaces
  add column alcance_atendente text not null default 'atribuidos'
    check (alcance_atendente in ('atribuidos', 'atribuidos_e_sem_dono', 'todos')),
  add column alcance_gerente text not null default 'todos'
    check (alcance_gerente in ('atribuidos', 'atribuidos_e_sem_dono', 'todos'));

comment on column public.workspaces.alcance_atendente is
  'B63: o que o Atendente vê (conversas, contatos e cards): atribuidos, atribuidos_e_sem_dono ou todos.';
comment on column public.workspaces.alcance_gerente is
  'B63: o que o Gerente vê (conversas, contatos e cards): atribuidos, atribuidos_e_sem_dono ou todos.';

-- 2. O alcance de quem está logado ---------------------------------------------------

create function public.alcance_do_usuario()
  returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case p.role
           when 'admin' then 'todos'
           when 'gerente' then w.alcance_gerente
           else w.alcance_atendente
         end
    from profiles p
    join workspaces w on w.id = p.workspace_id
   where p.id = auth.uid()
     and p.status = 'active'
$$;

-- Quem tem este dono (pessoa ou null) é visível para quem está logado? A empresa é
-- conferida por quem chama.
create function public.pode_ver_dono(p_dono uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case public.alcance_do_usuario()
           when 'todos' then true
           when 'atribuidos_e_sem_dono' then p_dono is null or p_dono = auth.uid()
           when 'atribuidos' then p_dono is not null and p_dono = auth.uid()
           else false
         end
$$;

revoke execute on function public.alcance_do_usuario() from public, anon;
revoke execute on function public.pode_ver_dono(uuid) from public, anon;
grant execute on function public.alcance_do_usuario() to authenticated, service_role;
grant execute on function public.pode_ver_dono(uuid) to authenticated, service_role;

-- 3. As duas funções que o resto já usa (etiquetas, compras, notas, campos, edições,
-- mensagens, vínculos de etiqueta) --------------------------------------------------

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
      and public.pode_ver_dono(c.atendente_id)
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
      and public.pode_ver_dono(c.assigned_to)
  )
$$;

-- 4. contacts: o Gerente deixa de ver tudo pelo cargo. A regra olha o dono na própria
-- linha: pode_ver_contato(id) procura o contato na tabela e não enxerga a linha que o
-- insert com retorno está gravando (o contato novo voltava como "não encontrado").

alter policy "Membros veem contatos do próprio workspace" on public.contacts
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_dono(atendente_id)
  );

-- 5. conversations -------------------------------------------------------------------

alter policy "Membros veem conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.contato_na_lixeira(contact_id)
    and public.pode_ver_dono(assigned_to)
  );

alter policy "Membros atualizam conversas do próprio workspace" on public.conversations
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and not public.contato_na_lixeira(contact_id)
    and public.pode_ver_dono(assigned_to)
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_dono(assigned_to)
  );

-- 6. pipeline_cards ------------------------------------------------------------------

alter policy "Cards visíveis por papel" on public.pipeline_cards
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_dono(atendente_id)
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Membros atualizam etapa dos cards do workspace" on public.pipeline_cards
  using (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_dono(atendente_id)
  )
  with check (
    workspace_id = (select public.get_auth_user_workspace_id())
    and public.pode_ver_dono(atendente_id)
  );

-- 7. Tempo real: o tópico da gestão é de quem vê tudo; o dos sem responsável, de quem
-- vê a fila aberta. O pessoal continua de cada um. -----------------------------------

alter policy "Gestão e responsável ouvem as mensagens novas" on realtime.messages
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (
        (select realtime.topic()) = 'workspace:' || (select public.get_auth_user_workspace_id())::text || ':gestao'
        and (select public.alcance_do_usuario()) = 'todos'
      )
      or (
        (select realtime.topic()) = 'usuario:' || (select auth.uid())::text
        and exists (select 1 from public.profiles where id = auth.uid() and status = 'active')
      )
    )
  );

alter policy "Empresa ouve as mensagens sem responsável" on realtime.messages
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'workspace:' || (select public.get_auth_user_workspace_id())::text || ':sem-responsavel'
    and (select public.alcance_do_usuario()) = 'atribuidos_e_sem_dono'
  );
