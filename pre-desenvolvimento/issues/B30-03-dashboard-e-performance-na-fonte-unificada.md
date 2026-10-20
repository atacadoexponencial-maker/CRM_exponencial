# B30-03: Dashboard e performance por vendedor contam todas as compras

**Tipo:** Implementação
**Página:** Dashboard e Performance por Vendedor
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

Os cards de receita do dashboard (total de compras, quantidade, ticket médio geral, ticket
de primeira compra, faturamento de clientes novos) e a tabela de performance por vendedor
(recompras e ticket médio) passam a olhar todas as compras, incluindo as que vieram do
catálogo, e a deixar de contar as que um pedido reaberto ou cancelado desfez. Compra com
atendente definido conta para ele; compra sem atendente segue a regra de hoje, o atendente
do card do contato no funil. O filtro por atendente do dashboard usa a mesma regra.

Depende da B30-01 (atendente na compra) e da B30-02 (compras vindas do catálogo).

## Pronto quando

Num período com uma compra manual de R$ 100,00 e um pedido do catálogo fechado de
R$ 250,00, o dashboard mostra R$ 350,00 em 2 compras. Na performance, a compra registrada
com o atendente Bruno aparece no ticket dele e não no da Ana, mesmo que o card do contato
seja da Ana; a compra antiga sem atendente continua com a Ana.

## Critérios de aceite

- **CA-B30-16** (automática) — Dashboard soma a compra do catálogo. Dado um período com uma compra manual de R$ 100,00 e um pedido do catálogo fechado de R$ 250,00, quando Admin abre o dashboard nesse período, então "Total de compras" mostra R$ 350,00 e a quantidade mostra 2.
- **CA-B30-17** (automática) — Performance usa o atendente da venda. Dado um contato cujo card do funil está com a atendente Ana e uma compra registrada com o atendente Bruno, quando Admin abre a performance por vendedor, então o ticket médio de Bruno inclui essa compra e o de Ana não.
- **CA-B30-18** (automática) — Compra sem atendente segue a regra de hoje. Dado uma compra manual antiga, sem atendente, de um contato cujo card está com a atendente Ana, quando Admin abre a performance por vendedor, então a compra conta para Ana.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-07 | Na performance por vendedor, compra com atendente conta para ele; compra sem atendente segue a regra atual (atendente do card do contato). | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
