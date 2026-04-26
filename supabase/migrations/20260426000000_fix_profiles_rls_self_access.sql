-- Corrige recursão infinita na política RLS de profiles.
-- A política de workspace faz uma inner query em profiles, que dispara a mesma
-- política novamente, resultando em null. Adicionar uma política direta de
-- auto-leitura (id = auth.uid()) resolve a recursão: a inner query cai aqui,
-- retorna o workspace_id sem loop, e a política de workspace funciona corretamente.
create policy "Usuários leem o próprio perfil"
  on profiles for select
  using (id = auth.uid());
