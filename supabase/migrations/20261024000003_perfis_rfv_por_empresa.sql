-- B43-02: o perfil RFV calculado por empresa, para quem roda sem usuário logado (o motor
-- das automações e a conferência de madrugada da B43-03). É o mesmo cálculo da B42-01
-- (ver 20261024000001_filtro_perfil_rfv.sql), só que a empresa vem no parâmetro e não há
-- filtro de quem pode ver: por isso só o service role executa.
--
-- perfis_rfv_da_empresa() passa a chamar esta, com a empresa de quem chama, e continua
-- devolvendo só os contatos que quem chama pode ver. O resultado não muda.

create or replace function public.perfis_rfv_do_workspace(p_workspace uuid)
returns table (contact_id uuid, perfil text)
language sql
stable
security definer
set search_path = public
as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  vendas as (
    select cp.contact_id, cp.data, cp.valor
    from contact_purchases cp
    join contacts c on c.id = cp.contact_id and c.excluido_em is null
    where cp.workspace_id = p_workspace
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
$$;

revoke all on function public.perfis_rfv_do_workspace(uuid) from public, anon, authenticated;
grant execute on function public.perfis_rfv_do_workspace(uuid) to service_role;

create or replace function public.perfis_rfv_da_empresa()
returns table (contact_id uuid, perfil text)
language sql
stable
security definer
set search_path = public
as $$
  select r.contact_id, r.perfil
  from public.perfis_rfv_do_workspace(
    (select p.workspace_id from profiles p where p.id = auth.uid() and p.status = 'active')
  ) r
  where public.pode_ver_contato(r.contact_id)
$$;

revoke all on function public.perfis_rfv_da_empresa() from public, anon;
grant execute on function public.perfis_rfv_da_empresa() to authenticated;
