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
