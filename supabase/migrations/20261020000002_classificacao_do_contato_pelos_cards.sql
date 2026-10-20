-- QA A3 (06/10/2026): contacts.classificacao nunca era gravada. A lista de Contatos
-- mostrava sempre "Sem histórico" e os filtros e a ordenação por classificação não
-- funcionavam; só o perfil calculava na hora (calcularClassificacao, em
-- src/app/(auth)/contatos/classificacao.ts).
--
-- Agora o banco recalcula a coluna a cada card que nasce, muda de etapa ou de
-- funil, ou é apagado. A regra é a mesma da função do CRM:
--   Recompra em onboarding/reposicao/ativos → ativo; ativos_ri → em_risco;
--   inativos/inativos_rp → inativo; perdidos → perdido; senão, com card na
--   Entrada → lead; sem card → sem_historico.
--
-- security definer: o gatilho lê todos os cards do contato (a RLS do atendente só
-- mostra os dele) e grava a coluna mesmo quando quem moveu o card não pode
-- atualizar contatos. Só esta coluna é tocada.

create or replace function public.recalcular_classificacao_do_contato(p_contact uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recompra text;
  v_nova text;
begin
  if p_contact is null then
    return;
  end if;

  select etapa into v_recompra
    from pipeline_cards
    where contact_id = p_contact and funil = 'recompra'
    order by created_at
    limit 1;

  if v_recompra in ('onboarding', 'reposicao', 'ativos') then
    v_nova := 'ativo';
  elsif v_recompra = 'ativos_ri' then
    v_nova := 'em_risco';
  elsif v_recompra in ('inativos', 'inativos_rp') then
    v_nova := 'inativo';
  elsif v_recompra = 'perdidos' then
    v_nova := 'perdido';
  elsif exists (select 1 from pipeline_cards where contact_id = p_contact and funil = 'entrada') then
    v_nova := 'lead';
  else
    v_nova := 'sem_historico';
  end if;

  update contacts
    set classificacao = v_nova
    where id = p_contact and classificacao is distinct from v_nova;
end;
$$;

revoke all on function public.recalcular_classificacao_do_contato(uuid) from public;

create or replace function public.trg_classificacao_do_contato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalcular_classificacao_do_contato(old.contact_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and new.contact_id is distinct from old.contact_id then
    perform public.recalcular_classificacao_do_contato(old.contact_id);
  end if;
  perform public.recalcular_classificacao_do_contato(new.contact_id);
  return new;
end;
$$;

drop trigger if exists classificacao_do_contato on public.pipeline_cards;
create trigger classificacao_do_contato
  after insert or delete or update of etapa, funil, contact_id on public.pipeline_cards
  for each row execute function public.trg_classificacao_do_contato();

-- Acerta o que já está no banco.
do $$
declare
  r record;
begin
  for r in select distinct contact_id from public.pipeline_cards where contact_id is not null loop
    perform public.recalcular_classificacao_do_contato(r.contact_id);
  end loop;
end;
$$;
