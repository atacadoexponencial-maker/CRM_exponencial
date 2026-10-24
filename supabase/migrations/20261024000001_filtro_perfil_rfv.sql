-- B42-01: o filtro de contatos ganha o campo "Perfil RFV" (Campanhas usam o mesmo filtro).
--
-- O perfil é o da aba RFV dos Relatórios sem filtro de atendente: calculado sobre a
-- empresa inteira, com a mesma regra de src/lib/relatorios/rfv.ts (calcularClientesRfv):
--   - compras até hoje (fuso de São Paulo), de contatos fora da lixeira;
--   - F = nº de compras e V = valor nos 12 meses (data > hoje - 12 meses), nota 1–5 por
--     quintil entre quem tem valor > 0; empatados recebem a nota do primeiro do empate
--     (rank()); zero é nota 1;
--   - R pelas faixas fixas de dias desde a última compra (30/60/90/180);
--   - FV = (F + V) / 2 arredondado para cima; perfil pela matriz FV × R.
-- A função é security definer porque a RLS das compras limita o Atendente aos contatos
-- dele, e o perfil precisa da base inteira. Ela só devolve perfil de contato que quem
-- chama pode ver (pode_ver_contato), então ninguém descobre nada de outra carteira.

create or replace function public.perfis_rfv_da_empresa()
returns table (contact_id uuid, perfil text)
language sql
stable
security definer
set search_path = public
as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  empresa as (
    select p.workspace_id
    from profiles p
    where p.id = auth.uid() and p.status = 'active'
  ),
  vendas as (
    select cp.contact_id, cp.data, cp.valor
    from contact_purchases cp
    join contacts c on c.id = cp.contact_id and c.excluido_em is null
    where cp.workspace_id = (select workspace_id from empresa)
      and cp.data <= (select d from hoje)
  ),
  por_contato as (
    select
      v.contact_id,
      count(*) filter (where v.data > ((select d from hoje) - interval '12 months')::date) as freq,
      round(coalesce(sum(v.valor) filter (where v.data > ((select d from hoje) - interval '12 months')::date), 0), 2) as valor,
      max(v.data) as ultima
    from vendas v
    group by v.contact_id
  ),
  ordenados as (
    select
      pc.*,
      rank() over (order by pc.freq desc) as rank_f,
      count(*) filter (where pc.freq > 0) over () as n_f,
      rank() over (order by pc.valor desc) as rank_v,
      count(*) filter (where pc.valor > 0) over () as n_v,
      (select d from hoje) - pc.ultima as dias
    from por_contato pc
  ),
  notas as (
    select
      o.contact_id,
      case when o.freq <= 0 then 1 else 5 - ((o.rank_f - 1) * 5) / o.n_f end as f,
      case when o.valor <= 0 then 1 else 5 - ((o.rank_v - 1) * 5) / o.n_v end as v,
      case
        when o.dias <= 30 then 5
        when o.dias <= 60 then 4
        when o.dias <= 90 then 3
        when o.dias <= 180 then 2
        else 1
      end as r
    from ordenados o
  ),
  com_fv as (
    select n.contact_id, n.r, ceil((n.f + n.v) / 2.0)::int as fv
    from notas n
  )
  select
    x.contact_id,
    (case x.fv
      when 5 then array['nao_perder', 'em_risco', 'fieis', 'fieis', 'campeao']
      when 4 then array['em_risco', 'em_risco', 'fieis', 'fieis', 'fieis']
      when 3 then array['em_risco', 'em_risco', 'precisa_atencao', 'potencial_fiel', 'potencial_fiel']
      when 2 then array['perdido', 'hibernando', 'semi_perdido', 'potencial_fiel', 'potencial_fiel']
      else array['perdido', 'perdido', 'semi_perdido', 'promissores', 'recentes']
    end)[x.r] as perfil
  from com_fv x
  where public.pode_ver_contato(x.contact_id)
$$;

revoke all on function public.perfis_rfv_da_empresa() from public, anon;
grant execute on function public.perfis_rfv_da_empresa() to authenticated;

-- A mesma função da B41-06, com o caso novo "perfil_rfv".

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
  v_rfv text;
begin
  if v_campo = 'nunca' then
    return 'false';
  end if;

  case v_campo
    when 'nome' then v_tipo := 'texto'; v_col := 'c.name';
    when 'telefone' then v_tipo := 'texto'; v_col := 'c.phone_number';
    when 'cidade' then v_tipo := 'texto'; v_col := 'c.cidade';
    when 'observacoes' then v_tipo := 'texto'; v_col := 'c.observacoes';
    when 'classificacao' then v_tipo := 'lista'; v_col := 'c.classificacao';
    when 'tipo' then v_tipo := 'lista'; v_col := 'c.tipo';
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
    -- B42-01: perfil RFV, calculado sobre a empresa inteira (perfis_rfv_da_empresa)
    when 'perfil_rfv' then v_tipo := 'rfv';
    when 'etapa_entrada' then v_tipo := 'funil'; v_funil := 'entrada';
    when 'etapa_recompra' then v_tipo := 'funil'; v_funil := 'recompra';
    else
      -- B41-06: funil da empresa, com o id do funil no campo ("funil:<uuid>")
      if v_campo ~ '^funil:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        v_tipo := 'funil'; v_funil := substr(v_campo, 7);
      else
        raise exception 'Campo de filtro desconhecido: %', v_campo;
      end if;
  end case;

  if v_tipo = 'rfv' then
    -- Subconsulta sem correlação: o cálculo roda uma vez por consulta. Quem não tem
    -- perfil (nunca comprou) não entra em "não é", como nas outras negativas.
    v_rfv := 'c.id in (select r.contact_id from public.perfis_rfv_da_empresa() r%s)';
    case v_comp
      when 'e' then return format(v_rfv, format(' where r.perfil = %L', v_v1));
      when 'nao_e' then return format(v_rfv, format(' where r.perfil <> %L', v_v1));
      when 'qualquer_de' then return format(v_rfv, format(' where r.perfil = any(%L::text[])', v_valores));
      when 'nao_vazio' then return format(v_rfv, '');
      when 'vazio' then return 'not ' || format(v_rfv, '');
      else raise exception 'Comparação % não vale para perfil RFV', v_comp;
    end case;
  end if;

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
