-- QA C2 (06/10/2026): salvar sequência apagava as etapas antes de inserir as novas,
-- sem transação; um insert com erro deixava a sequência vazia, e na criação cada
-- tentativa com erro deixava uma sequência vazia duplicada.
--
-- Esta função faz tudo numa transação só. security invoker: sequência e etapas
-- passam pelo RLS de quem chama (admin da própria empresa). O workspace vem da
-- sessão, nunca do parâmetro.
--
-- p_id: null cria; uuid atualiza a sequência da própria empresa.
-- p_etapas: array de { "tipo", "prazo_dias", "conteudo", "instrucao" }, na ordem.
create or replace function public.salvar_sequencia(
  p_id uuid,
  p_nome text,
  p_gatilho text,
  p_etapas jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workspace uuid := public.get_auth_user_workspace_id();
  v_id uuid;
begin
  if v_workspace is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  if jsonb_typeof(p_etapas) <> 'array' or jsonb_array_length(p_etapas) = 0 then
    raise exception 'a sequência precisa de pelo menos uma etapa' using errcode = '22023';
  end if;

  if p_id is null then
    insert into sequences (workspace_id, nome, gatilho, predefinida)
      values (v_workspace, p_nome, p_gatilho, false)
      returning id into v_id;
  else
    update sequences set nome = p_nome, gatilho = p_gatilho
      where id = p_id and workspace_id = v_workspace
      returning id into v_id;
    if v_id is null then
      raise exception 'sequência não encontrada' using errcode = 'P0002';
    end if;
    delete from sequence_steps where sequence_id = v_id;
  end if;

  insert into sequence_steps (sequence_id, ordem, tipo, prazo_dias, conteudo, instrucao)
    select v_id,
           (e.ordinality - 1)::int,
           e.value->>'tipo',
           (e.value->>'prazo_dias')::int,
           e.value->>'conteudo',
           e.value->>'instrucao'
    from jsonb_array_elements(p_etapas) with ordinality as e;

  return v_id;
end;
$$;

revoke all on function public.salvar_sequencia(uuid, text, text, jsonb) from public;
grant execute on function public.salvar_sequencia(uuid, text, text, jsonb) to authenticated;
