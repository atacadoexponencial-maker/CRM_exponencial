# B36-05: Pipeline no estilo Caderno

**Tipo:** Implementação
**Página:** /pipeline e /pipeline/recompra
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar os funis de Entrada e Recompra como no quadro: abas sublinhadas, colunas com linhas finas, quantidade e soma no título e cards com há quanto tempo estão parados.

## Pronto quando

Os dois funis seguem o quadro, com soma por coluna e tempo parado nos cards, e tudo o que se fazia antes continua funcionando.

## Critérios de aceite

- **CA-B36-23** (automática) — Coluna mostra quantidade e soma. Dado uma etapa com 3 cards de R$ 100, R$ 250 e sem valor, quando o pipeline abre, então o título da coluna mostra 3 e R$ 350.
- **CA-B36-24** (automática) — Card mostra há quanto tempo está parado. Dado um card que entrou na etapa atual há 4 dias e outro há 2 horas, com o limite de card parado da empresa em 3 dias, quando o pipeline abre, então o primeiro mostra "parado 4 dias" em vermelho e o segundo "há 2 h" em cinza.
- **CA-B36-25** (manual) — Pipeline aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre os funis de Entrada e Recompra, arrasta um card e abre um card, nos dois temas, no computador e no celular, então ela aprova que segue o quadro e que tudo o que fazia antes continua funcionando.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-05 | "Parado há" no card do pipeline conta desde que o card entrou na etapa atual; o limite para ficar vermelho é o de card parado que a empresa já configura nos Alertas (sem limite configurado, não fica vermelho) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
