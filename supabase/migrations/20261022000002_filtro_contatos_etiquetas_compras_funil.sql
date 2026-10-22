-- B37-02: o filtro de contatos ganha etiquetas, compras e etapa do funil.
--
-- Mesma assinatura da B37-01; só a condição aprende campos novos. Os campos novos
-- olham outras tabelas por subconsulta, e a RLS delas vale (a função roda com a
-- permissão de quem chama): o Atendente conta só o que enxerga.
--
-- Compras vêm de contact_purchases, a mesma fonte do card do funil e dos
-- Relatórios (B30: pedido do catálogo fechado já vira compra). SUP-B37-04.
-- "Não tem a etiqueta" traz quem não tem etiqueta nenhuma (PER-B37-09); "não está
-- na etapa" só traz quem está no funil, em outra etapa (PER-B37-10).

create or replace function public.condicao_de_contato_sql(p_cond jsonb)
returns text
language plpgsql
stable
set search_path = public, extensions
as $$
declare
  v_campo text := p_cond->>'campo';
  v_comp text := p_cond->>'comparacao';
  v_valores text[] := coalesce(array(select jsonb_array_elements_text(p_cond->'valores')), '{}');
  v_tipo text;
  v_col text;
  v_v1 text := v_valores[1];
  v_v2 text := v_valores[2];
  v_norm text;
  v_like text;
  v_funil text;
  v_hoje text := format('(now() at time zone %L)::date', 'America/Sao_Paulo');
  v_tem text := 'exists (select 1 from contact_tags t where t.contact_id = c.id%s)';
  v_card text := 'exists (select 1 from pipeline_cards k where k.contact_id = c.id and k.funil = %L%s)';
begin
  case v_campo
    when 'nome' then v_tipo := 'texto'; v_col := 'c.name';
    when 'telefone' then v_tipo := 'texto'; v_col := 'c.phone_number';
    when 'cidade' then v_tipo := 'texto'; v_col := 'c.cidade';
    when 'observacoes' then v_tipo := 'texto'; v_col := 'c.observacoes';
    when 'classificacao' then v_tipo := 'lista'; v_col := 'c.classificacao';
    when 'tipo' then v_tipo := 'lista'; v_col := 'c.tipo';
    when 'nicho' then v_tipo := 'lista'; v_col := 'c.nicho';
    when 'uf' then v_tipo := 'lista'; v_col := 'c.uf::text';
    when 'icp' then v_tipo := 'lista'; v_col := 'c.icp';
    when 'atendente' then v_tipo := 'lista'; v_col := 'c.atendente_id::text';
    when 'data_cadastro' then v_tipo := 'data'; v_col := 'c.created_at';
    when 'etiqueta' then v_tipo := 'etiqueta';
    when 'total_comprado' then
      v_tipo := 'numero'; v_col := '(select coalesce(sum(p.valor), 0) from contact_purchases p where p.contact_id = c.id)';
    when 'qtd_compras' then
      v_tipo := 'numero'; v_col := '(select count(*) from contact_purchases p where p.contact_id = c.id)';
    when 'ultima_compra' then
      v_tipo := 'dia'; v_col := '(select max(p.data) from contact_purchases p where p.contact_id = c.id)';
    when 'etapa_entrada' then v_tipo := 'funil'; v_funil := 'entrada';
    when 'etapa_recompra' then v_tipo := 'funil'; v_funil := 'recompra';
    else raise exception 'Campo de filtro desconhecido: %', v_campo;
  end case;

  if v_tipo = 'etiqueta' then
    case v_comp
      when 'tem' then return format(v_tem, format(' and t.tag = %L', v_v1));
      when 'nao_tem' then return 'not ' || format(v_tem, format(' and t.tag = %L', v_v1));
      when 'tem_qualquer' then return format(v_tem, format(' and t.tag = any(%L::text[])', v_valores));
      when 'tem_todas' then
        return format(
          '((select count(distinct t.tag) from contact_tags t where t.contact_id = c.id and t.tag = any(%L::text[])) = %s)',
          v_valores, (select count(distinct v) from unnest(v_valores) v)
        );
      when 'sem_etiqueta' then return 'not ' || format(v_tem, '');
      when 'com_etiqueta' then return format(v_tem, '');
      else raise exception 'Comparação % não vale para etiqueta', v_comp;
    end case;
  end if;

  if v_tipo = 'funil' then
    case v_comp
      when 'na_etapa' then return format(v_card, v_funil, format(' and k.etapa = %L', v_v1));
      when 'fora_da_etapa' then
        return format('(%s and not %s)', format(v_card, v_funil, ''), format(v_card, v_funil, format(' and k.etapa = %L', v_v1)));
      when 'no_funil' then return format(v_card, v_funil, '');
      when 'fora_do_funil' then return 'not ' || format(v_card, v_funil, '');
      else raise exception 'Comparação % não vale para funil', v_comp;
    end case;
  end if;

  if v_tipo = 'numero' then
    case v_comp
      when 'maior' then return format('(%s > %L::numeric)', v_col, v_v1);
      when 'menor' then return format('(%s < %L::numeric)', v_col, v_v1);
      when 'igual' then return format('(%s = %L::numeric)', v_col, v_v1);
      when 'entre' then return format('(%s between %L::numeric and %L::numeric)', v_col, v_v1, v_v2);
      else raise exception 'Comparação % não vale para número', v_comp;
    end case;
  end if;

  if v_tipo = 'dia' then
    -- A compra guarda o dia; "hoje" é o dia em Brasília.
    case v_comp
      when 'antes' then return format('(%s < %L::date)', v_col, v_v1);
      when 'depois' then return format('(%s > %L::date)', v_col, v_v1);
      when 'entre' then return format('(%s between %L::date and %L::date)', v_col, v_v1, v_v2);
      when 'ultimos_dias' then return format('(%s >= %s - %L::int)', v_col, v_hoje, v_v1);
      when 'ha_mais_de_dias' then return format('(%s < %s - %L::int)', v_col, v_hoje, v_v1);
      when 'vazio' then return format('(%s is null)', v_col);
      when 'nao_vazio' then return format('(%s is not null)', v_col);
      else raise exception 'Comparação % não vale para data', v_comp;
    end case;
  end if;

  v_norm := format('lower(extensions.unaccent(%s))', v_col);

  if v_comp = 'vazio' and v_tipo <> 'data' then
    return format('(%s is null or btrim(%s) = %L)', v_col, v_col, '');
  elsif v_comp = 'nao_vazio' and v_tipo <> 'data' then
    return format('(%s is not null and btrim(%s) <> %L)', v_col, v_col, '');
  end if;

  if v_tipo = 'texto' then
    -- %, _ e \ digitados são literais (QA M18).
    v_like := '%' || replace(replace(replace(lower(extensions.unaccent(coalesce(v_v1, ''))), '\', '\\'), '%', '\%'), '_', '\_') || '%';
    case v_comp
      when 'contem' then return format('(%s like %L escape %L)', v_norm, v_like, '\');
      when 'nao_contem' then
        return format('(%s is not null and btrim(%s) <> %L and %s not like %L escape %L)', v_col, v_col, '', v_norm, v_like, '\');
      when 'igual' then return format('(%s = lower(extensions.unaccent(%L)))', v_norm, v_v1);
      else raise exception 'Comparação % não vale para texto', v_comp;
    end case;
  elsif v_tipo = 'lista' then
    case v_comp
      when 'e' then return format('(%s = %L)', v_col, v_v1);
      when 'nao_e' then return format('(%s <> %L)', v_col, v_v1);
      when 'qualquer_de' then return format('(%s = any(%L::text[]))', v_col, v_valores);
      else raise exception 'Comparação % não vale para lista', v_comp;
    end case;
  else
    -- Datas no fuso da operação: o dia escolhido vai de 00:00 a 24:00 em Brasília.
    case v_comp
      when 'antes' then
        return format('(%s < (%L::date)::timestamp at time zone %L)', v_col, v_v1, 'America/Sao_Paulo');
      when 'depois' then
        return format('(%s >= ((%L::date) + 1)::timestamp at time zone %L)', v_col, v_v1, 'America/Sao_Paulo');
      when 'entre' then
        return format('(%s >= (%L::date)::timestamp at time zone %L and %s < ((%L::date) + 1)::timestamp at time zone %L)',
          v_col, v_v1, 'America/Sao_Paulo', v_col, v_v2, 'America/Sao_Paulo');
      when 'ultimos_dias' then
        return format('(%s >= now() - make_interval(days => %L::int))', v_col, v_v1);
      when 'ha_mais_de_dias' then
        return format('(%s < now() - make_interval(days => %L::int))', v_col, v_v1);
      when 'vazio' then return format('(%s is null)', v_col);
      when 'nao_vazio' then return format('(%s is not null)', v_col);
      else raise exception 'Comparação % não vale para data', v_comp;
    end case;
  end if;
end;
$$;
