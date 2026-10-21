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

## Cenários

### Happy Path
1. O dashboard já lê todas as linhas de `contact_purchases` da empresa (`carregarDados` em `src/app/(auth)/dashboard/actions.ts`). Depois da B30-02, as compras do catálogo estão nessa tabela e as desfeitas por reabertura ou cancelamento já não estão. Os cards de receita somam tudo sem mudar de fórmula.
2. A consulta passa a trazer também `atendente_id` da compra (`PurchaseRow` ganha `atendente_id: string | null`).
3. Na performance por vendedor (`calcularPerformanceVendedores`), a compra entra na linha de um atendente se `atendente_id` é ele; se a compra não tem atendente, entra na linha do atendente do card do contato (regra de hoje). A linha "Sem atendente" fica com as compras sem atendente de contatos cujos cards não têm atendente.
4. O filtro por atendente do dashboard (`carregarDados` com `atendenteId`) usa a mesma regra: compra do atendente, ou sem atendente e de contato dele.

### Edge Cases
- Compra com atendente Bruno de um contato cujo card é da Ana: conta só para Bruno, nunca para os dois.
- Compra com atendente que não está mais ativo: não aparece em linha nenhuma da performance (a lista de linhas é de perfis ativos), e não cai para o atendente do card. Comportamento aceito nesta issue: a venda é dele.
- Compra sem atendente de contato sem card: não conta para ninguém na performance (igual a hoje); conta no dashboard geral.

### Cenário de Erro
- Não há entrada do usuário nem gravação; falha de leitura segue devolvendo `null` como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B30-16 | automática | `src/test/dashboard-fonte-unificada.integration.test.ts` | Com uma compra manual de R$ 100 e um pedido do catálogo fechado de R$ 250 no período, `buscarMetricasDashboard` devolve total R$ 350 e 2 compras; o filtro por atendente segue a regra da venda |
| CA-B30-17 | automática | `src/test/metricas-dashboard.test.ts` e `src/test/dashboard-fonte-unificada.integration.test.ts` | Compra com atendente Bruno de contato cujo card é da Ana entra no ticket de Bruno e não no de Ana |
| CA-B30-18 | automática | `src/test/metricas-dashboard.test.ts` e `src/test/dashboard-fonte-unificada.integration.test.ts` | Compra sem atendente de contato cujo card é da Ana entra no ticket de Ana |

## Arquivos

- **Modificar:** `src/lib/metricas-dashboard.ts` — `PurchaseRow` ganha `atendente_id`; `calcularPerformanceVendedores` atribui a compra pelo atendente da venda, caindo para o atendente do card quando não há.
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — seleciona `atendente_id` das compras; o filtro por atendente usa a mesma regra.
- **Modificar:** `src/test/metricas-dashboard.test.ts` — testes unitários da regra de atribuição (CA-B30-17, CA-B30-18).
- **Criar:** `src/test/dashboard-fonte-unificada.integration.test.ts` — testes de ponta a ponta com Supabase real (CA-B30-16, CA-B30-17, CA-B30-18).

## Checklist

- [x] `PurchaseRow` com `atendente_id` e consulta do dashboard trazendo a coluna
- [x] Performance: compra com atendente conta para ele; sem atendente, para o atendente do card
- [x] Filtro por atendente do dashboard com a mesma regra
- [x] Testes da tabela Prova escritos e passando; testes antigos do dashboard continuam passando
- [x] `npm run build` e `npx eslint src --quiet` limpos
