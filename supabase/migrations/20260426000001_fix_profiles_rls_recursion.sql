-- A política "Usuários veem perfis do próprio workspace" usa uma subquery em
-- profiles para obter o workspace_id do usuário autenticado. Essa subquery
-- dispara as políticas SELECT de profiles novamente, causando recursão infinita.
-- Adicionamos uma policy "id = auth.uid()" na migração anterior, mas o Postgres
-- avalia todas as políticas (OR) sem garantia de short-circuit, então a subquery
-- recursiva ainda executa mesmo quando a política direta já seria suficiente.
--
-- Solução: usar uma função SECURITY DEFINER para obter o workspace_id do usuário.
-- Funções SECURITY DEFINER executam como o owner da função (sem RLS), quebrando
-- a recursão.

create or replace function public.get_auth_user_workspace_id()
  returns uuid
  language sql
  security definer
  stable
  set search_path = public
as $$
  select workspace_id from profiles where id = auth.uid()
$$;

drop policy if exists "Usuários veem perfis do próprio workspace" on profiles;

create policy "Usuários veem perfis do próprio workspace"
  on profiles for select
  using (workspace_id = public.get_auth_user_workspace_id());
