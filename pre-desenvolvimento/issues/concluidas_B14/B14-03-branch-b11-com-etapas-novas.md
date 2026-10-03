# B14-03: Branch da B11 com as etapas novas do Funil de Entrada

**Tipo:** Implementação
**Página:** Automações v2 (protótipo e issues da série B11)
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-entrada.md` — seção "Série B11"
**Depende de:** B14-01 e B14-02 no `master`

## Descrição

Levar a mudança de etapas para o trabalho do Luan: fazer o merge do `master` no branch
`b11-automacoes-v2`, trocar as etapas antigas do Funil de Entrada que o protótipo e as
issues da B11 citam (ex.: `em_qualificacao`) pelas novas.

> 03/10/2026: a Marcelle decidiu que não precisa mandar mensagem ao Luan — o branch não
> tem trabalho dele ainda (último commit é dela, de 02/10).

## Pronto quando

O branch `b11-automacoes-v2` está com o `master` mergeado, o protótipo das automações v2
abre e mostra as 8 etapas novas do Funil de Entrada, nenhum arquivo do branch fora de
`issues/concluidas_*/` cita `em_qualificacao`, `em_negociacao` ou `primeira_compra`.

## Cenários

### Happy Path
1. Numa pasta à parte (`git worktree`), sem tocar no `master` local, o branch
   `b11-automacoes-v2` recebe o merge de `origin/master`.
2. Conflito único no `pre-desenvolvimento/README.md` (tabela "Em andamento"): fica a
   linha da B11 do branch (fluxo de blocos, mais atual), sai a da B12 (concluída) e
   entram as da B13 e B14 que vieram do `master`.
3. O protótipo das automações v2 (`components/catalogo.ts`) já lê `ETAPAS_ENTRADA` de
   `mock-pipeline.ts`: depois do merge passa a listar as 8 etapas sem mudança.
4. O dado de exemplo do protótipo que usa `em_qualificacao` passa a usar `sondagem`.
5. Push do branch: a Vercel gera o preview; o protótipo abre e mostra as 8 etapas.

### Edge Cases
- **Trabalho local do Luan não enviado**: se existir, o próximo push dele pede `git pull`;
  o merge só mexe em etapas, README e protótipo, então conflito é improvável e pequeno.
- **Textos históricos**: `B11-01` (linhas sobre o defeito de acento corrigido na B12-01),
  `referencia/` e os planos de teste dos módulos 2 a 5 citam "Em Qualificação"/"Primeira
  Compra" como registro da época. Ficam — o critério desta issue é só nome interno, e os
  planos de teste existem iguais no `master` (fora do escopo).

### Cenário de Erro
- Merge com conflito inesperado: parar e resolver arquivo a arquivo; nada vai para o
  remoto antes de o build passar.
- Preview falha: corrigir no branch; o `master` e a produção não são afetados.

## Arquivos

- **Modificar (branch `b11-automacoes-v2`):** `pre-desenvolvimento/README.md` — resolução do conflito do merge
- **Modificar (branch `b11-automacoes-v2`):** `src/app/(auth)/configuracoes/automacoes/prototipo/dados-exemplo.ts` — `em_qualificacao` → `sondagem`
- **Modificar (`master`):** `pre-desenvolvimento/README.md` — tirar a linha da B14 de "Em andamento" e pôr em "Concluído" ao fechar a série
- **Mover (`master`):** `pre-desenvolvimento/spec-etapas-funil-entrada.md` → `docs/specs-arquivadas/`

## Checklist

- [x] Merge de `origin/master` no `b11-automacoes-v2` (worktree), conflito do README resolvido (`59fe81e`)
- [x] `dados-exemplo.ts` com `sondagem`
- [x] `git grep` por `em_qualificacao`/`em_negociacao`/`primeira_compra` no branch (fora de concluídas, specs arquivadas e migrations) não acha nada
- [x] `npm run build` passa no branch (com `npm ci` próprio: o branch tem `@xyflow/react`)
- [x] Push do branch; preview da Vercel pronto e protótipo com as 8 etapas (03/10: conferido com `next start` do branch + Playwright — o gatilho "Card movido para etapa" lista Lead…Perdido; exemplo mostra "Sondagem")
- [x] `master`: spec arquivada e README com a B14 em "Concluído"
