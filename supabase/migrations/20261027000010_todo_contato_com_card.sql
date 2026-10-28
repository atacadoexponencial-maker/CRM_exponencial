-- B45-01: todo contato nasce com card na primeira etapa do Funil de Entrada
-- (decisão da Marcelle, 27/10/2026). O código passa a criar o card de quem nasce
-- daqui para a frente; esta migration dá o card a quem já existe sem nenhum.
--
-- O card nasce na etapa Lead, com o dono do contato (a carteira) como atendente,
-- ou sem atendente quando o contato não tem dono. Contato com card em qualquer
-- funil não ganha outro. Não dispara automação: é arrumação da base, não
-- chegada de lead (PER-B45-09).

create or replace function public.criar_cards_de_entrada_que_faltam(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  criados integer;
begin
  insert into pipeline_cards (workspace_id, contact_id, funil, etapa, atendente_id)
  select c.workspace_id, c.id, 'entrada', 'lead', c.atendente_id
    from contacts c
   where c.workspace_id = p_workspace_id
     and not exists (select 1 from pipeline_cards p where p.contact_id = c.id)
  on conflict (workspace_id, contact_id, funil) do nothing;
  get diagnostics criados = row_count;
  return criados;
end
$$;

-- Como na B44-11: o Supabase dá EXECUTE a anon e authenticated diretamente.
revoke execute on function public.criar_cards_de_entrada_que_faltam(uuid) from public, anon, authenticated;
grant execute on function public.criar_cards_de_entrada_que_faltam(uuid) to service_role;

select public.criar_cards_de_entrada_que_faltam(id) from workspaces;
