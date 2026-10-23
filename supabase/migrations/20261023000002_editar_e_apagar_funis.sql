-- B41-02: apagar etapa (levando os cards para outra) e apagar funil (com os cards).
-- As duas funções são security invoker: valem a RLS e os papéis de quem chama
-- (só Admin e Gerente gravam funis, etapas e tiram cards dos funis da empresa).
-- Spec: pre-desenvolvimento/spec-funis-personalizados.md

create or replace function public.apagar_etapa(p_etapa uuid, p_destino uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_funil uuid;
  v_cards int;
begin
  select funil_id into v_funil from funil_etapas where id = p_etapa;
  if v_funil is null then
    raise exception 'Etapa não encontrada.' using errcode = 'P0001';
  end if;
  if (select count(*) from funil_etapas where funil_id = v_funil) <= 1 then
    raise exception 'O funil precisa de ao menos uma etapa.' using errcode = 'P0001';
  end if;

  select count(*) into v_cards from pipeline_cards where funil = v_funil::text and etapa = p_etapa::text;
  if v_cards > 0 then
    if p_destino is null or p_destino = p_etapa
       or not exists (select 1 from funil_etapas where id = p_destino and funil_id = v_funil) then
      raise exception 'Escolha outra etapa deste funil para os cards.' using errcode = 'P0001';
    end if;

    insert into pipeline_card_history (card_id, de_etapa, para_etapa, alterado_por)
      select id, etapa, p_destino::text, auth.uid()
      from pipeline_cards
      where funil = v_funil::text and etapa = p_etapa::text;

    update pipeline_cards
      set etapa = p_destino::text, etapa_changed_at = now()
      where funil = v_funil::text and etapa = p_etapa::text;

    if exists (select 1 from pipeline_cards where funil = v_funil::text and etapa = p_etapa::text) then
      raise exception 'Sem permissão para mover os cards.' using errcode = '42501';
    end if;
  end if;

  delete from funil_etapas where id = p_etapa;
  if found is false then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.apagar_etapa(uuid, uuid) from public;
grant execute on function public.apagar_etapa(uuid, uuid) to authenticated;

create or replace function public.apagar_funil(p_funil uuid)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cards int;
begin
  if not exists (select 1 from funis where id = p_funil) then
    raise exception 'Funil não encontrado.' using errcode = 'P0001';
  end if;

  delete from pipeline_cards where funil = p_funil::text;
  get diagnostics v_cards = row_count;
  if exists (select 1 from pipeline_cards where funil = p_funil::text) then
    raise exception 'Sem permissão para tirar os cards.' using errcode = '42501';
  end if;

  delete from funis where id = p_funil;
  if found is false then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  return v_cards;
end;
$$;

revoke all on function public.apagar_funil(uuid) from public;
grant execute on function public.apagar_funil(uuid) to authenticated;
