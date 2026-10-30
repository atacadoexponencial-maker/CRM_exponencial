-- B53-02: "Atribuir ao time" escolhe só entre os Atendentes ativos do time
-- (roteiro de QA do Luan, 26-27/10/2026). Gerente e Admin cadastrados no time
-- nunca são escolhidos, e conversa com um deles não conta como "já está com o
-- time". Time sem Atendente ativo: nenhuma linha, e o motor falha com "O time
-- não tem atendente ativo".
--
-- O resto é igual à B22-04 (20261009000001_atribuir_conversa_ao_time.sql):
-- mesma assinatura, mesma trava por time, mesma ordem (menos conversas
-- abertas, depois o nome) e mesmas permissões.

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

  -- Já está com um Atendente ativo do time: fica com ele, sem gravar nada
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
         and p.role = 'atendente'
    ) then
      return query select v_atual, true;
      return;
    end if;
  end if;

  -- O Atendente ativo com menos conversas abertas, sem contar a própria conversa.
  -- No empate, o primeiro pelo nome, para o resultado ser previsível.
  select p.id into v_escolhido
    from user_teams ut
    join teams t on t.id = ut.team_id
    join profiles p on p.id = ut.user_id
   where ut.team_id = p_team_id
     and t.workspace_id = p_workspace_id
     and p.workspace_id = p_workspace_id
     and p.status = 'active'
     and p.role = 'atendente'
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

  -- Time sem Atendente ativo: nenhuma linha
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
