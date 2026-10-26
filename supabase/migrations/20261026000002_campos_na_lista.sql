-- B38-02: o campo personalizado vira coluna da lista de Contatos quando a empresa marca.
-- A escolha é da empresa: todos veem as mesmas colunas (PER-B38-09).
-- Spec: pre-desenvolvimento/spec-campos-personalizados.md

alter table public.campos_personalizados
  add column mostrar_na_lista boolean not null default false;
