-- B44-02: o dono da empresa (auditoria de 27/10/2026).
--
-- Admin agora pode promover outra pessoa a Admin e rebaixar ou desativar outro
-- Admin. Para ninguém trancar quem criou a empresa do lado de fora, o dono fica
-- guardado aqui e só muda pelo suporte. `workspaces` só tem política de leitura,
-- então o navegador não troca o dono.

alter table public.workspaces
  add column dono_id uuid references public.profiles(id) on delete set null;

comment on column public.workspaces.dono_id is
  'Admin que criou a empresa no /cadastro (B44-02). Não pode ser rebaixado nem desativado pela tela.';

-- Empresas que já existem: o Admin mais antigo.
update public.workspaces w
   set dono_id = (
     select p.id from public.profiles p
      where p.workspace_id = w.id and p.role = 'admin'
      order by p.created_at, p.id
      limit 1
   )
 where w.dono_id is null;

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

  -- B44-02: quem cadastra a empresa é o dono dela.
  update workspaces set dono_id = p_user_id where id = v_workspace_id;

  insert into teams (workspace_id, name, is_default)
  values (v_workspace_id, 'Entrada', true),
         (v_workspace_id, 'Recompra', true);

  return v_workspace_id;
end;
$$;

revoke execute on function public.cadastrar_empresa(uuid, text, text) from public, anon, authenticated;
grant execute on function public.cadastrar_empresa(uuid, text, text) to service_role;
