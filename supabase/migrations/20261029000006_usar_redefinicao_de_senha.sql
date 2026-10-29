-- B52-02: gastar o link de senha nova. Só gasta se o link ainda vale e a conta ainda está
-- ativa (desativada depois do pedido: CA-B52-13). Dois salvamentos ao mesmo tempo: o
-- segundo update espera a trava da linha, relê `usado_em` preenchido e não acha nada.
create or replace function public.usar_redefinicao_de_senha(p_token_hash text)
returns uuid
language sql
security definer
set search_path = public
as $$
  update redefinicoes_de_senha r
     set usado_em = now()
    from profiles p
   where r.token_hash = p_token_hash
     and p.id = r.user_id
     and p.status = 'active'
     and r.usado_em is null
     and r.cancelado_em is null
     and r.expira_em > now()
  returning r.user_id;
$$;

revoke execute on function public.usar_redefinicao_de_senha(text) from public, anon, authenticated;
grant execute on function public.usar_redefinicao_de_senha(text) to service_role;
