-- B45-02: um dono só para o contato, os cards e as conversas (decisão da Marcelle,
-- 27/10/2026). O código passa a trocar os três juntos; esta migration alinha o que já
-- existe e aceita a troca feita pelo Chat no histórico de carteira.

alter table public.carteira_historico drop constraint carteira_historico_motivo_check;
alter table public.carteira_historico add constraint carteira_historico_motivo_check
  check (motivo in ('transferencia', 'remocao', 'distribuicao', 'ultima_venda', 'pelo_card', 'pelo_chat'));

-- Alinha os donos de uma empresa. Contato sem dono ganha quem está na conversa mais
-- recente com responsável (SUP-B45-01); sem isso, o atendente do card mais recente com
-- atendente (PER-B45-10). Depois, cards e conversas ficam com o dono do contato
-- (CA-B45-11). Sem linha no histórico: é arrumação da base (PER-B45-11).
create or replace function public.alinhar_donos_dos_contatos(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  donos integer;
begin
  update contacts c
     set atendente_id = coalesce(
       (select v.assigned_to from conversations v
         where v.contact_id = c.id and v.assigned_to is not null
         order by v.created_at desc limit 1),
       (select p.atendente_id from pipeline_cards p
         where p.contact_id = c.id and p.atendente_id is not null
         order by p.created_at desc limit 1))
   where c.workspace_id = p_workspace_id
     and c.atendente_id is null
     and (exists (select 1 from conversations v where v.contact_id = c.id and v.assigned_to is not null)
       or exists (select 1 from pipeline_cards p where p.contact_id = c.id and p.atendente_id is not null));
  get diagnostics donos = row_count;

  update pipeline_cards p
     set atendente_id = c.atendente_id
    from contacts c
   where c.id = p.contact_id
     and c.workspace_id = p_workspace_id
     and p.atendente_id is distinct from c.atendente_id;

  update conversations v
     set assigned_to = c.atendente_id
    from contacts c
   where c.id = v.contact_id
     and c.workspace_id = p_workspace_id
     and v.assigned_to is distinct from c.atendente_id;

  return donos;
end
$$;

-- Como na B44-11: o Supabase dá EXECUTE a anon e authenticated diretamente.
revoke execute on function public.alinhar_donos_dos_contatos(uuid) from public, anon, authenticated;
grant execute on function public.alinhar_donos_dos_contatos(uuid) to service_role;

select public.alinhar_donos_dos_contatos(id) from workspaces;
