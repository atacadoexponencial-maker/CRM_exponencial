-- B36-01: cada usuário escolhe o tema (claro ou escuro). O claro é o padrão.
-- A escolha fica no perfil para valer em qualquer aparelho em que ele entrar.
-- O próprio usuário troca o tema, como já troca o nome (B19-02: grant por coluna).

alter table public.profiles
  add column if not exists tema text not null default 'claro'
  check (tema in ('claro', 'escuro'));

grant update (tema) on public.profiles to authenticated;
