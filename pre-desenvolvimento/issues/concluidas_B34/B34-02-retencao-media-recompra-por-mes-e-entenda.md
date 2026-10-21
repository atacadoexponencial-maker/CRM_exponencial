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

## Cenários

### Happy Path
1. `calcularCoortes` passa a devolver `resumo`: a retenção média geral (ponderada pelo tamanho das coortes, meses 1 a 11 que já existem, zeros contam) e a recompra geral por mês (Mês 1 a 11; numerador = clientes com venda no mês k somados nas coortes; denominador = clientes das coortes que já chegaram ao mês k; "—" quando nenhuma coorte chegou).
2. A aba Coorte mostra, acima das tabelas, o cartão "Retenção média geral" e o gráfico "Recompra geral por mês" (barras, Recharts), e abaixo o bloco recolhível "Entenda a análise de coortes" com as quatro explicações.
3. Clicar na aba Coorte na tela Relatórios mostra tudo (CA-B34-01).

### Edge Cases
- Sem coorte com idade ≥ 1: retenção média "—" e gráfico sem barras ("Ainda não há meses para comparar").
- Coorte sem cliente não entra nas somas.

### Cenário de Erro
- Nenhum novo.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B34-01 | automática | `src/test/relatorios-coorte-resumo.test.tsx` | Clicar na aba "Coorte" mostra retenção média, gráfico, tabelas e o bloco Entenda |
| CA-B34-05 | automática | `src/test/relatorios-coorte-resumo.test.tsx` | Coortes A (4 clientes, 25% e 50%) e B (2 clientes, 0%): retenção média geral 30% |
| CA-B34-06 | automática | `src/test/relatorios-coorte-resumo.test.tsx` | Mês 1 = 16,7%, Mês 2 = 50%, Mês 3 a 11 nulos |

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/relatorios/coorte.ts` — `resumoDasCoortes` e `ResultadoCoorte.resumo`.
- **Modificar:** `src/app/(auth)/relatorios/components/coorte-client.tsx` — cartão, gráfico e bloco Entenda.
- **Criar:** `src/test/relatorios-coorte-resumo.test.tsx` — testes da tabela Prova.

## Dependências Externas

- `recharts` — já instalado.

## Checklist

- [x] Lib: retenção média geral e recompra geral por mês
- [x] Cartão, gráfico e Entenda na aba
- [x] Testes passando
