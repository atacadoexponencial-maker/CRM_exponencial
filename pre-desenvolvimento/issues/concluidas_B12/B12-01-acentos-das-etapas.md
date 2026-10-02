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

## Cenários

### Happy Path
1. O usuário abre o Funil de Entrada (hoje Expansão): as colunas mostram "Em
   Qualificação", "Catálogo Enviado" e "Em Negociação".
2. Abre um card: o painel mostra a etapa com acento certo.
3. Na tela de automações, a escolha de etapa lista os mesmos nomes corretos.

### Edge Cases
- Os `id` das etapas (`em_qualificacao`, `catalogo_enviado`...) não têm acento e não
  mudam: nenhum card no banco é afetado.
- Os dados de exemplo do mesmo arquivo (nomes de contato como "Empório da Família",
  notas, etiquetas "Atenção" e "Indicação") também voltam ao normal — são o mesmo
  defeito no mesmo arquivo.
- O arquivo perde o BOM (marca invisível no início), como os demais arquivos do projeto.

### Cenário de Erro
- Diagnóstico (02/10): as 22 linhas com caractere não-ASCII do arquivo são texto UTF-8
  lido como Windows-1252 e regravado. A conversão inversa (cp1252 → bytes → UTF-8) foi
  testada sem gravar: as 22 convertem e não sobra `Ã`/`â€`. Se alguma linha não
  convertesse, ela seria corrigida à mão.

## Banco de Dados

Não se aplica — os nomes das etapas vivem no código; o banco guarda só o `id`.

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — reconverter a codificação
  (22 linhas) e remover o BOM. Nenhuma outra mudança no arquivo.

Busca por `Ã.`/`â€` em `src/`, `e2e/` e `supabase/` (02/10): só este arquivo tem o
defeito. Os 7 arquivos que o importam (`automacoes-client.tsx`, `pipeline/actions.ts`,
`card-lead.tsx`, `coluna-kanban.tsx`, `funil-expansao.tsx`, `funil-retencao.tsx`,
`painel-card.tsx`) passam a mostrar o texto certo sem mudança.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Reconverter `mock-pipeline.ts` de "UTF-8 lido como cp1252" para UTF-8 sem BOM
- [x] Conferir que `git diff` só toca as 22 linhas com acento (e a 1ª linha, pelo BOM)
- [x] Conferir que não sobra `Ã`/`â€` em `src/`, `e2e/` e `supabase/`
- [x] `npm run lint` e `npx tsc --noEmit` sem erro novo
- [x] ~~Teste unitário~~ — não há plano de testes da série B12 em `pre-desenvolvimento/testes/`; a skill `testes` não cria teste fora do plano. Coberto pela busca de `Ã`/`â€` acima.
- [x] Conferir o que a tela recebe: `ETAPAS_EXPANSAO` carregado mostra "Lead | Em Qualificação | Catálogo Enviado | Em Negociação | Primeira Compra" (02/10). Conferência visual no navegador fica para o fim da série, depois da B12-04.
