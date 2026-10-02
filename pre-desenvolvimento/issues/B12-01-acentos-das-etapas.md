# B12-01: Etapas e etiquetas com acento certo

**Tipo:** Implementação
**Página:** Pipeline (os dois funis), painel do card, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seção "Acentos das etapas e etiquetas"

## Descrição

Corrigir a codificação de `src/app/(auth)/pipeline/mock-pipeline.ts`, quebrada desde o
commit `507232c` (12/06/2026): "Em QualificaÃ§Ã£o", "CatÃ¡logo Enviado", "Em
NegociaÃ§Ã£o", "AtenÃ§Ã£o" e afins voltam a ter acento certo. Conferir se algum outro
arquivo do `src/` tem o mesmo padrão de texto quebrado (`Ã§`, `Ã£`, `Ã¡`, `Ã©`...).

Vem antes das outras da série porque mexe no mesmo arquivo que a B12-02 e a B12-04 vão
renomear; corrigir primeiro evita misturar as duas mudanças num diff só.

## Pronto quando

No CRM publicado, as colunas do Funil de Entrada (hoje Expansão), o painel do card e a
escolha de etapa na tela de automações mostram "Em Qualificação", "Catálogo Enviado" e
"Em Negociação" com acento certo, e nenhuma tela do sistema mostra `Ã§`/`Ã£` no lugar de
letra acentuada.
