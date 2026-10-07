-- B19-01: o cadastro de empresa vira uma operação só. Empresa, perfil Admin e times
-- padrão nascem na mesma transação — ou nasce tudo, ou nada. A função sempre cria uma
-- empresa NOVA: não existe mais caminho para pôr um Admin numa empresa que já existe.
-- O usuário do Auth é criado antes pelo servidor; se esta função falhar, o servidor o apaga.

create or replace function public.cadastrar_empresa(
  p_user_id uuid,
  p_nome_empresa text,
  p_nome_responsavel text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if exists (select 1 from profiles where id = p_user_id) then
    raise exception 'usuário já tem perfil';
  end if;

  insert into workspaces (name)
  values (p_nome_empresa)
  returning id into v_workspace_id;

  insert into profiles (id, workspace_id, name, role)
  values (p_user_id, v_workspace_id, p_nome_responsavel, 'admin');

  insert into teams (workspace_id, name, is_default)
  values (v_workspace_id, 'Entrada', true),
         (v_workspace_id, 'Recompra', true);

  return v_workspace_id;
end;
$$;

revoke execute on function public.cadastrar_empresa(uuid, text, text) from public, anon, authenticated;
grant execute on function public.cadastrar_empresa(uuid, text, text) to service_role;
