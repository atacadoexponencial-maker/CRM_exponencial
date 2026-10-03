# B15-03: Branch da B11 com as etapas novas da Recompra

**Tipo:** Implementação
**Página:** Automações v2 (protótipo e issues da série B11)
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Spec:** `pre-desenvolvimento/spec-etapas-funil-recompra.md` — seção "Série B11"
**Depende de:** B15-01 e B15-02 no `master`

## Descrição

Fazer o merge do `master` no branch `b11-automacoes-v2` e trocar as etapas antigas da
Recompra que o protótipo e as issues da B11 citam pelas novas. Sem mensagem ao Luan.

## Pronto quando

O branch `b11-automacoes-v2` está com o `master` mergeado, o protótipo das automações v2
mostra as 7 etapas novas da Recompra, e nenhum arquivo do branch fora de
`issues/concluidas_*/`, specs arquivadas e migrations cita `em_onboarding`,
`aguardando_recompra`, `cliente_ativo`, `recompra_realizada`, `em_risco` ou `inativo`
como etapa.

## Cenários

### Happy Path
1. Numa pasta à parte (`git worktree`), o branch `b11-automacoes-v2` recebe o merge de
   `origin/master` — testado em 03/10: entra sem conflito.
2. O protótipo das automações v2 lê `ETAPAS_RECOMPRA` de `mock-pipeline.ts`: depois do
   merge lista as 7 etapas novas sem mudança de código.
3. `git grep` no branch (fora de concluídas, specs arquivadas, migrations, referência e
   planos de teste): nenhuma etapa antiga da Recompra; o material da B11 não cita
   "Em Risco"/"Inativo".
4. Push do branch; preview da Vercel pronto.

### Edge Cases
- `perdido` que sobra nos testes é do Funil de Entrada (continua `perdido`) — correto.
- Trabalho local do Luan não enviado: o próximo push dele pede `git pull`.

### Cenário de Erro
- Build falha no branch: corrigir antes do push; `master` e produção não são afetados.

## Arquivos

- **Merge (branch `b11-automacoes-v2`):** nenhum arquivo editado à mão — o merge traz a B15
- **Modificar (`master`):** `pre-desenvolvimento/README.md` — B15 sai de "Em andamento" e entra em "Concluído"
- **Mover (`master`):** `pre-desenvolvimento/spec-etapas-funil-recompra.md` → `docs/specs-arquivadas/`

## Checklist

- [x] Merge de `origin/master` no `b11-automacoes-v2` (worktree) — `fd9feea`, sem conflito
- [x] `git grep` sem etapas antigas da Recompra no branch
- [x] `npm ci` + `npm run build` passam no branch
- [x] Protótipo do branch lista as 7 etapas da Recompra (`next start` + Playwright) — 03/10: Onboarding…Perdidos no gatilho "Card movido para etapa"
- [x] Push do branch; preview pronto
- [x] `master`: spec arquivada e README com a B15 em "Concluído"
