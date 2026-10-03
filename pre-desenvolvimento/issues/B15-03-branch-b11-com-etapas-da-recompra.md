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
