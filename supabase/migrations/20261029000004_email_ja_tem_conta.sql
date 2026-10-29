-- B51-03: convite para um e-mail que já tem conta é recusado na hora de criar.
-- Lê auth.users direto, sem paginar a lista do Auth; só a chave de serviço chama.
create or replace function public.email_ja_tem_conta(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from auth.users where lower(email) = lower(btrim(p_email)));
$$;

revoke execute on function public.email_ja_tem_conta(text) from public, anon, authenticated;
grant execute on function public.email_ja_tem_conta(text) to service_role;
