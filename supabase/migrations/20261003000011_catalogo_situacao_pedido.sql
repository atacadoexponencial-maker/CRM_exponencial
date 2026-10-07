-- B16-10: mudar a situação do pedido do catálogo. Qualquer papel da empresa pode;
-- a função confere a empresa de quem chama e se a mudança é permitida, e grava quem mudou.
-- Transições: novo → em_atendimento | fechado | cancelado; em_atendimento → fechado |
-- cancelado; fechado → cancelado; cancelado → nada.

create or replace function public.mudar_situacao_pedido_catalogo(p_pedido uuid, p_para text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quem uuid := auth.uid();
  v_empresa uuid;
  v_de text;
begin
  if v_quem is null then
    raise exception 'sem sessão' using errcode = '42501';
  end if;
  select workspace_id into v_empresa from profiles where id = v_quem and status = 'active';

  select status into v_de from catalog_orders where id = p_pedido and workspace_id = v_empresa for update;
  if v_de is null then
    raise exception 'pedido não encontrado' using errcode = 'P0002';
  end if;

  if not (
    (v_de = 'novo' and p_para in ('em_atendimento', 'fechado', 'cancelado')) or
    (v_de = 'em_atendimento' and p_para in ('fechado', 'cancelado')) or
    (v_de = 'fechado' and p_para = 'cancelado')
  ) then
    raise exception 'mudança não permitida: % → %', v_de, p_para using errcode = '22023';
  end if;

  update catalog_orders set status = p_para where id = p_pedido;
  insert into catalog_order_events (order_id, from_status, to_status, changed_by) values (p_pedido, v_de, p_para, v_quem);
end;
$$;

revoke execute on function public.mudar_situacao_pedido_catalogo(uuid, text) from public, anon;
grant execute on function public.mudar_situacao_pedido_catalogo(uuid, text) to authenticated;
