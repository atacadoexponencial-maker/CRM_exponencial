# B34-03: Aba Funil de clientes e aprovação das duas abas

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Funil de clientes
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-coorte-e-funil.md`

## Descrição

Nasce a aba Funil de clientes: sete etapas "1+ a 7+ compras" (toda a história), funil colorido com quantidade e conversão, legenda com parados (sem venda há mais de 90 dias), cartões de conversão, tabela por etapa com ticket médio e parados, o link "O que são clientes parados?" e as dicas. Com as duas abas no ar, a Marcelle aprova em produção.

## Pronto quando

Na empresa de teste, Relatórios → Funil de clientes mostra o funil com as etapas, as conversões e os parados das vendas semeadas; a Marcelle aprova Coorte e Funil no computador e no celular.

## Critérios de aceite

- **CA-B34-09** (automática) — Etapas do funil com quantidade, conversão e ticket médio. Dado 10 clientes com 1 venda de R$ 100 cada, 5 com 2 vendas (R$ 100 cada venda) e 2 com 3 vendas (R$ 100 cada venda), quando o funil é calculado, então 1+ tem 17 clientes, 2+ tem 7, 3+ tem 2 e 4+ a 7+ têm 0; as conversões são 41,2% (1→2) e 28,6% (2→3); o ticket médio de 2+ é R$ 242,86 (1.700 ÷ 7).
- **CA-B34-10** (automática) — Clientes parados por etapa. Dado hoje 21/10/2026 e, na etapa 2+, um cliente com última venda há 91 dias e outro há 90 dias, quando os parados são contados, então a etapa 2+ mostra 1 parado.
- **CA-B34-11** (automática) — A aba Funil de clientes abre o relatório. Dado a tela Relatórios aberta, quando o usuário clica na aba "Funil de clientes", então a aba fica selecionada e aparecem o funil com as sete etapas, a legenda, os cartões de conversão, a tabela e as dicas.
- **CA-B34-12** (manual) — As abas Coorte e Funil aprovadas pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11" com as vendas de 25 meses, quando a Marcelle abre as abas Coorte e Funil de clientes em produção, no computador e no celular, então as tabelas de coorte têm a cor por intensidade, o funil tem as sete etapas coloridas, tudo legível no tema escuro e os números batem com a base.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B34-01 | As etapas do funil contam todas as vendas do cliente em toda a história, não só nos últimos 12 meses. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-03 | "Cliente parado" no funil = sem venda há mais de 90 dias, o limiar da B33. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
