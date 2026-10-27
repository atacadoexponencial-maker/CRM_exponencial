-- B38-09: todo campo personalizado vira coluna da lista de Contatos, e cada usuário
-- escolhe quais colunas vê (revisão da PER-B38-09, depois do teste CA-B38-59).
-- Guarda as colunas ESCONDIDAS, para que um campo criado depois apareça ligado para todos:
-- chaves das colunas fixas (whatsapp, classificacao, perfil_rfv, tipo, cidade, atendente)
-- e ids de campos personalizados.
-- Spec: pre-desenvolvimento/spec-campos-personalizados.md

alter table public.profiles
  add column if not exists colunas_ocultas_contatos text[] not null default '{}';

-- O próprio usuário troca, como o tema (B36-01; B19-02: grant por coluna).
grant update (colunas_ocultas_contatos) on public.profiles to authenticated;

-- A marca "Mostrar na lista de Contatos" do campo deixa de existir.
alter table public.campos_personalizados drop column if exists mostrar_na_lista;
