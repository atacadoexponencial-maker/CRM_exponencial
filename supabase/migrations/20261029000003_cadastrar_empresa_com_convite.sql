-- B51-02: o cadastro de empresa passa a gastar um convite, na mesma transação que cria
-- a empresa. `cadastrar_empresa` fica como está: o roteiro que recria a empresa de
-- teste (e2e/preview/criar-empresa-teste.cjs) chama ela direto, pela chave de serviço.
--
-- Dois cadastros com o mesmo convite ao mesmo tempo: o segundo update espera a trava
-- da linha, relê a condição com `usado_em` já preenchido e não acha nada.
create or replace function public.cadastrar_empresa_com_convite(
  p_user_id uuid,
  p_nome_empresa text,
  p_nome_responsavel text,
  p_convite_hash text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite_id uuid;
  v_workspace_id uuid;
begin
  update convites
     set usado_em = now()
   where token_hash = p_convite_hash
     and usado_em is null
     and cancelado_em is null
     and expira_em > now()
     and (email is null or email = lower(p_email))
  returning id into v_convite_id;

  if v_convite_id is null then
    raise exception 'convite_invalido';
  end if;

  v_workspace_id := cadastrar_empresa(p_user_id, p_nome_empresa, p_nome_responsavel);

  update convites set workspace_id = v_workspace_id where id = v_convite_id;

  return v_workspace_id;
end;
$$;

revoke execute on function public.cadastrar_empresa_com_convite(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.cadastrar_empresa_com_convite(uuid, text, text, text, text) to service_role;
