-- B20-05: freio de tentativas no cadastro e no login. Cada tentativa contada vira uma
-- linha; a chave é um hash SHA-256 de `ip:<endereço>` ou `email:<e-mail>`, então a
-- tabela não guarda e-mail nem IP em claro. Só o servidor (service role) lê e grava.

create table public.tentativas_de_acesso (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('cadastro', 'login')),
  chave text not null,
  criado_em timestamptz not null default now()
);

create index tentativas_de_acesso_busca on public.tentativas_de_acesso (tipo, chave, criado_em);

alter table public.tentativas_de_acesso enable row level security;
revoke all on public.tentativas_de_acesso from anon, authenticated;
