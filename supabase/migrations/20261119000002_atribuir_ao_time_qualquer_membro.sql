-- B63-04: "Atribuir ao time" volta a escolher entre todos os membros ativos do time,
-- de qualquer cargo (decisão do Luan, 19/11/2026, SUP-B63-03; desfaz a B53-02).
-- Admin e Gerente do time recebem leads pela carga, e conversa com um deles conta como
-- "já está com o time". Time sem membro ativo: nenhuma linha, e o motor falha com "O
-- time não tem membro ativo".
--
-- O resto é igual à B53-02 (20261030000001_atribuir_ao_time_so_atendentes.sql): mesma
-- assinatura, mesma trava por time, mesma ordem (menos conversas abertas, depois o
-- nome) e mesmas permissões. Volta atrás: rodar de novo a definição de lá.

create or replace function public.atribuir_conversa_ao_time(
  p_workspace_id uuid,
  p_team_id uuid,
  -- A conversa aberta do evento, ou null quando o contato não tem
  p_conversation_id uuid
)
returns table (atendente_id uuid, manteve boolean)
language plpgsql
set search_path = public
as $$
declare
  v_atual uuid;
  v_escolhido uuid;
begin
  perform pg_advisory_xact_lock(hashtext('atribuir_conversa_ao_time:' || p_team_id::text));

  -- Já está com um membro ativo do time: fica com ele, sem gravar nada
  if p_conversation_id is not null then
    select c.assigned_to into v_atual
      from conversations c
     where c.id = p_conversation_id and c.workspace_id = p_workspace_id;

    if v_atual is not null and exists (
      select 1
        from user_teams ut
        join teams t on t.id = ut.team_id
        join profiles p on p.id = ut.user_id
       where ut.team_id = p_team_id
         and ut.user_id = v_atual
         and t.workspace_id = p_workspace_id
         and p.workspace_id = p_workspace_id
         and p.status = 'active'
    ) then
      return query select v_atual, true;
      return;
    end if;
  end if;

  -- O membro ativo com menos conversas abertas, sem contar a própria conversa.
  -- No empate, o primeiro pelo nome, para o resultado ser previsível.
  select p.id into v_escolhido
    from user_teams ut
    join teams t on t.id = ut.team_id
    join profiles p on p.id = ut.user_id
   where ut.team_id = p_team_id
     and t.workspace_id = p_workspace_id
     and p.workspace_id = p_workspace_id
     and p.status = 'active'
   order by (
       select count(*)
         from conversations c
        where c.workspace_id = p_workspace_id
          and c.assigned_to = p.id
          and c.status in ('em_espera', 'em_atendimento')
          and c.id is distinct from p_conversation_id
     ),
     p.name,
     p.id
   limit 1;

  -- Time sem membro ativo: nenhuma linha
  if v_escolhido is null then
    return;
  end if;

  -- Como o "Atribuir" do chat: em espera passa a em atendimento; resolvida
  -- continua resolvida (B22-03)
  if p_conversation_id is not null then
    update conversations
       set assigned_to = v_escolhido,
           status = case when status = 'em_espera' then 'em_atendimento' else status end
     where id = p_conversation_id and workspace_id = p_workspace_id;
  end if;

  return query select v_escolhido, false;
end;
$$;

revoke execute on function public.atribuir_conversa_ao_time(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.atribuir_conversa_ao_time(uuid, uuid, uuid) to service_role;
