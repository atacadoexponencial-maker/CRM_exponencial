-- B52-01: "Esqueci minha senha". O link do e-mail leva um código aleatório; o banco
-- guarda só o SHA-256 dele, como nos convites (B51). Vale 1 hora (PER-B52-01) e uma
-- vez; um pedido novo derruba os anteriores daquela conta (cancelado_em).
--
-- RLS ligado e sem política: só a chave de serviço lê e grava.
create table if not exists public.redefinicoes_de_senha (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  -- Preenchido quando a senha nova é salva (B52-02)
  usado_em timestamptz,
  cancelado_em timestamptz
);

create index if not exists redefinicoes_de_senha_user_id on public.redefinicoes_de_senha (user_id);

alter table public.redefinicoes_de_senha enable row level security;
revoke all on public.redefinicoes_de_senha from anon, authenticated;

-- A conta que pode receber o link: usuário do Auth com aquele e-mail e perfil ativo.
-- Desativada (B20-02), sem perfil ou inexistente: nulo, e nenhum e-mail sai.
create or replace function public.conta_ativa_por_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
    from auth.users u
    join profiles p on p.id = u.id
   where lower(u.email) = lower(btrim(p_email))
     and p.status = 'active'
   limit 1;
$$;

revoke execute on function public.conta_ativa_por_email(text) from public, anon, authenticated;
grant execute on function public.conta_ativa_por_email(text) to service_role;

-- O freio do pedido de link (3 por e-mail e 10 por endereço, por hora: SUP-B52-01)
alter table public.tentativas_de_acesso drop constraint if exists tentativas_de_acesso_tipo_check;
alter table public.tentativas_de_acesso
  add constraint tentativas_de_acesso_tipo_check
  check (tipo in ('cadastro', 'login', 'pedido_loja', 'teste_automacao', 'pedido_telefone', 'senha_nova'));
