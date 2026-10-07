-- B20-02: usuário desativado perde o acesso ao banco, inclusive com o token que já
-- tinha. O ban no Supabase Auth derruba login, refresh e getUser, mas o PostgREST
-- aceita o token já emitido até ele expirar (conferido em 06/10/2026).
--
-- Toda policy de `public` descobre a empresa por get_auth_user_workspace_id() ou lendo o
-- próprio perfil numa subconsulta (onde a RLS de `profiles` vale). Fechando os dois
-- para perfil inativo, todas as policies fecham para ele.

create or replace function public.get_auth_user_workspace_id()
  returns uuid
  language sql
  security definer
  stable
  set search_path = public
as $$
  select workspace_id from profiles where id = auth.uid() and status = 'active'
$$;

drop policy if exists "Usuários leem o próprio perfil" on public.profiles;
create policy "Usuários leem o próprio perfil"
  on public.profiles for select
  using (id = auth.uid() and status = 'active');
