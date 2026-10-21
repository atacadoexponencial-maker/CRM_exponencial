# B32-01: Período do Dashboard até o fim do dia

**Tipo:** Implementação
**Página:** Dashboard (`/dashboard`) e performance por vendedor; cálculo de período compartilhado
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

O fim do período do Dashboard passa a ser o fim do dia de hoje (23:59:59), e não a hora atual, para a compra registrada hoje contar a qualquer hora. O cálculo de período fica num lugar só, que a tela Relatórios vai reaproveitar nas issues seguintes.

## Pronto quando

Às 9h da manhã, uma compra registrada hoje na empresa de teste já aparece no total de compras do Dashboard. Os testes do Dashboard passam de manhã e à tarde.

## Critérios de aceite

- **CA-B32-22** (automática) — Compra de hoje conta a qualquer hora. Dado uma compra registrada hoje e o relógio marcando 9h, quando o Dashboard calcula a receita dos últimos 30 dias, então a compra está no total.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Às 9h, o Admin abre o Dashboard com "Últimos 30 dias".
2. `rangeDoPeriodo` devolve `fim` = hoje às 23:59:59.999 e `inicio` = 30 dias atrás.
3. A compra com `data` = hoje (comparada como hoje ao meio-dia) fica dentro do intervalo e entra na receita, no ticket e na performance por vendedor.

### Edge Cases
- Período "custom" já põe o fim em 23:59:59 da data final; continua igual.
- Período "mes" e "trimestre": só o fim muda; o início segue no dia 1.
- Leads por semana e recompras no período passam a incluir eventos de hoje à tarde também, o que é o esperado.

### Cenário de Erro
- Nenhum: a função é pura e não acessa banco.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-22 | automática | `src/test/metricas-dashboard.test.ts` | Com o relógio às 9h, uma compra com data de hoje entra em `receita.totalCompras` e em `quantidadeCompras` de `calcularMetricas` com o intervalo de `rangeDoPeriodo({ periodo: "30d" })` |

## Banco de Dados

Não se aplica.

## Arquivos

- **Modificar:** `src/lib/metricas-dashboard.ts` — `rangeDoPeriodo` põe `fim` no fim do dia de hoje (23:59:59.999) em todos os períodos; a função continua sendo o único cálculo de período, reaproveitado pela tela Relatórios.
- **Modificar:** `src/test/metricas-dashboard.test.ts` — teste do CA-B32-22 e ajuste do teste antigo "calcula intervalo de 7 dias", que esperava o fim igual à hora atual.

## Dependências Externas

Nenhuma.

## Checklist

- [x] `rangeDoPeriodo` devolve `fim` no fim do dia para 7d, 30d, 90d, mês e trimestre
- [x] Teste CA-B32-22 escrito e passando
- [x] Teste antigo do intervalo de 7 dias ajustado ao fim do dia
- [x] Suíte `metricas-dashboard.test.ts` e `qa-medios-funcoes.test.ts` passando
