-- B37-01: filtro avançado da lista de contatos.
--
-- O filtro chega como JSON: { juncao: 'e'|'ou', grupos: [{ juncao, condicoes: [
-- { campo, comparacao, valores: text[] } ] }] }. Campos e comparações vêm de uma
-- lista fechada (o mesmo catálogo de src/lib/filtro-contatos.ts); o que não está
-- nela levanta erro. Valores entram sempre por format('%L'), nunca concatenados.
--
-- security invoker: roda com a permissão de quem chama, então a RLS de contacts
-- vale como na lista de hoje (o Atendente só vê os dele, B21-02).
--
-- Texto compara sem maiúscula e sem acento (PER-B37-08). Comparação negativa não
-- traz campo vazio (SUP-B37-01): "Cidade não é Fortaleza" exige cidade preenchida.

create extension if not exists unaccent with schema extensions;

-- Uma condição vira um trecho de SQL. Função à parte para a de baixo ficar legível.
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
    else raise exception 'Campo de filtro desconhecido: %', v_campo;
  end case;

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

-- p_rapidos: condições dos botões fixos da lista, todas com E, somadas ao filtro.
create or replace function public.filtrar_contatos(
  p_filtro jsonb default '{}'::jsonb,
  p_rapidos jsonb default '[]'::jsonb,
  p_busca text default null,
  p_ordem text default 'recente',
  p_limite int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  phone_number text,
  classificacao text,
  tipo text,
  nicho text,
  cidade text,
  uf text,
  created_at timestamptz,
  atendente_nome text,
  total bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions
as $$
declare
  v_where text[] := array['c.excluido_em is null'];
  v_grupos text[] := '{}';
  v_conds text[];
  v_grupo jsonb;
  v_cond jsonb;
  v_termo text;
  v_digitos text;
  v_ordem text;
begin
  for v_grupo in select g from jsonb_array_elements(coalesce(p_filtro->'grupos', '[]'::jsonb)) g loop
    v_conds := '{}';
    for v_cond in select k from jsonb_array_elements(coalesce(v_grupo->'condicoes', '[]'::jsonb)) k loop
      v_conds := v_conds || public.condicao_de_contato_sql(v_cond);
    end loop;
    if cardinality(v_conds) > 0 then
      v_grupos := v_grupos || ('(' || array_to_string(v_conds, case when v_grupo->>'juncao' = 'ou' then ' or ' else ' and ' end) || ')');
    end if;
  end loop;
  if cardinality(v_grupos) > 0 then
    v_where := v_where || ('(' || array_to_string(v_grupos, case when p_filtro->>'juncao' = 'ou' then ' or ' else ' and ' end) || ')');
  end if;

  for v_cond in select k from jsonb_array_elements(coalesce(p_rapidos, '[]'::jsonb)) k loop
    v_where := v_where || public.condicao_de_contato_sql(v_cond);
  end loop;

  -- Busca da lista: nome sem acento, ou os dígitos do telefone (QA M29).
  v_termo := btrim(coalesce(p_busca, ''));
  if v_termo <> '' then
    v_digitos := regexp_replace(v_termo, '\D', '', 'g');
    v_termo := '%' || replace(replace(replace(lower(extensions.unaccent(v_termo)), '\', '\\'), '%', '\%'), '_', '\_') || '%';
    v_where := v_where || format(
      '(lower(extensions.unaccent(coalesce(c.name, %L))) like %L escape %L%s)',
      '', v_termo, '\',
      case when length(v_digitos) >= 3 then format(' or c.phone_number like %L', '%' || v_digitos || '%') else '' end
    );
  end if;

  v_ordem := case p_ordem
    when 'nome' then 'lower(extensions.unaccent(coalesce(c.name, c.phone_number))), c.id'
    when 'classificacao' then
      'case c.classificacao when ''ativo'' then 0 when ''lead'' then 1 when ''em_risco'' then 2 when ''inativo'' then 3 when ''perdido'' then 4 else 5 end, c.created_at desc, c.id'
    else 'c.created_at desc, c.id'
  end;

  return query execute format(
    'select c.id, c.name::text, c.phone_number::text, c.classificacao::text, c.tipo::text, c.nicho::text,
            c.cidade::text, c.uf::text, c.created_at, p.name::text, count(*) over ()
       from contacts c
       left join profiles p on p.id = c.atendente_id
      where %s
      order by %s
      limit %s offset %s',
    array_to_string(v_where, ' and '),
    v_ordem,
    greatest(1, least(coalesce(p_limite, 50), 200)),
    greatest(0, coalesce(p_offset, 0))
  );
end;
$$;

grant execute on function public.filtrar_contatos(jsonb, jsonb, text, text, int, int) to authenticated;
