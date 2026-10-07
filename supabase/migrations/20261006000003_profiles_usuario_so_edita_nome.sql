-- B19-02: o usuário só edita o próprio nome. Antes, a policy de UPDATE em `profiles`
-- só exigia "é o seu perfil" e o papel `authenticated` podia atualizar todas as
-- colunas — qualquer um se dava papel de Admin, se reativava ou trocava de empresa.
--
-- Papel, situação e empresa continuam mudando pelas telas de Admin, que gravam com a
-- service role (não depende de grant nem de RLS).

revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

drop policy if exists "Usuários atualizam próprio perfil" on public.profiles;
create policy "Usuários atualizam próprio perfil"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
