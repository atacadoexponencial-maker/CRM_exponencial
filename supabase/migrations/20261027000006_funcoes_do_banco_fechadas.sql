-- B44-11: funções do banco que respondiam a qualquer um (auditoria de 27/10/2026).
--
-- O Supabase dá EXECUTE a anon e authenticated diretamente, então `revoke ... from
-- public` não fechava nada.
--
-- recalcular_classificacao_do_contato: só o gatilho dos cards a chama (como dono),
-- e a chave de serviço. Sai de anon e authenticated.
--
-- contato_na_lixeira e conversa_na_lixeira: as políticas de conversations e messages
-- as chamam com o papel de quem consulta, então authenticated precisa continuar
-- podendo chamá-las. Saem do visitante sem login, e passam a responder só sobre
-- contato e conversa da empresa de quem pergunta. Nas políticas as linhas já são da
-- empresa, então nada muda para o chat; a chave de serviço (automações) continua
-- recebendo a resposta de verdade.

revoke execute on function public.recalcular_classificacao_do_contato(uuid) from public, anon, authenticated;
grant execute on function public.recalcular_classificacao_do_contato(uuid) to service_role;

create or replace function public.contato_na_lixeira(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from contacts
     where id = p_contact_id
       and excluido_em is not null
       and (auth.role() = 'service_role' or workspace_id = public.get_auth_user_workspace_id())
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
    where v.id = p_conversation_id
      and c.excluido_em is not null
      and (auth.role() = 'service_role' or v.workspace_id = public.get_auth_user_workspace_id())
  )
$$;

revoke execute on function public.contato_na_lixeira(uuid) from public, anon;
revoke execute on function public.conversa_na_lixeira(uuid) from public, anon;
grant execute on function public.contato_na_lixeira(uuid) to authenticated, service_role;
grant execute on function public.conversa_na_lixeira(uuid) to authenticated, service_role;
