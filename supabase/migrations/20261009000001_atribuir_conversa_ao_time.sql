-- B22-04: a ação "atribuir ao time" escolhe o atendente e grava a conversa numa
-- operação só, travada por time (achado A6 do QA das automações, 09/10/2026).
-- Só acrescenta uma função: o CRM publicado não a usa e não percebe nada.
--
-- Antes, o motor lia a carga de cada membro e gravava depois, em idas separadas
-- ao banco. Eventos de contatos diferentes rodam em paralelo, então leads que
-- chegavam juntos liam a mesma carga e caíam todos no mesmo atendente. Aqui a
-- trava por time faz a segunda chamada esperar a primeira gravar, e ela já conta
-- a conversa nova na carga de quem a recebeu.
--
-- Conversa que já está com um membro ativo do time fica com ele: sem isso, uma
-- regra que roda a cada mensagem passava a conversa de um para outro (a própria
-- conversa contava como carga de quem estava com ela).
--
-- O card do contato continua sendo passado pelo motor, depois desta função
-- (src/lib/automacoes/acoes.ts): ele não entra na carga.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 20.

create function public.atribuir_conversa_ao_time(
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

  -- Time sem ninguém ativo: nenhuma linha
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
