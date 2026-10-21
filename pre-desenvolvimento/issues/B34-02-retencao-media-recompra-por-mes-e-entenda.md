# B34-02: Retenção média geral, recompra geral por mês e bloco Entenda

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Coorte
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-coorte-e-funil.md`

## Descrição

Completa a aba Coorte: o cartão "Retenção média geral" (ponderada pelo tamanho das coortes, meses 1 a 11 existentes, zeros contam), o gráfico de barras "Recompra geral por mês" (Mês 1 a 11, denominador = clientes das coortes que já chegaram ao mês) e o bloco recolhível "Entenda a análise de coortes" com as quatro explicações. Com isso, clicar na aba mostra todos os blocos (CA-B34-01). Depende da B34-01.

## Pronto quando

Na empresa de teste, a aba Coorte abre com o percentual de retenção média, o gráfico de recompra com 11 barras, as tabelas e o Entenda recolhido.

## Critérios de aceite

- **CA-B34-01** (automática) — A aba Coorte abre o relatório. Dado a tela Relatórios aberta, quando o usuário clica na aba "Coorte", então a aba fica selecionada e aparecem a retenção média geral, o gráfico de recompra por mês, as tabelas e o bloco "Entenda".
- **CA-B34-05** (automática) — Retenção média geral ponderada. Dado a coorte A com 4 clientes e idade 2 (Mês 1: 25%, Mês 2: 50%) e a coorte B com 2 clientes e idade 1 (Mês 1: 0%), quando a retenção média geral é calculada, então ela é 30% ((4×25 + 4×50 + 2×0) ÷ (4×2 + 2×1)).
- **CA-B34-06** (automática) — Recompra geral por mês. Dado as mesmas coortes A e B, quando a recompra geral é calculada, então o Mês 1 é 16,7% (1 ÷ 6) e o Mês 2 é 50% (2 ÷ 4); do Mês 3 ao 11, "—".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B34-04 | A recompra geral no mês k divide pelos clientes das coortes que já chegaram ao mês k, não por todas as coortes. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
