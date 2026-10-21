# B34-01: Aba Coorte com as tabelas de retenção e valor médio e Excel

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Coorte
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-coorte-e-funil.md`

## Descrição

Nasce o cálculo das coortes (mês da primeira venda, 12 coortes mais recentes, Mês 0 a 11 com idade) e a aba Coorte ativa com as duas tabelas em abas internas, "Retenção de clientes" e "Valor médio de venda", com a cor da célula por intensidade, balão com o mês calendário, botão Exportar em cada tabela (`GET /relatorios/coorte/exportar?tabela=...`) e o filtro de atendente da tela.

## Pronto quando

Na empresa de teste, Relatórios → Coorte mostra as 12 coortes com a retenção e o valor médio mês a mês das vendas semeadas; Exportar baixa cada tabela; logada como Atendente, só os clientes dela.

## Critérios de aceite

- **CA-B34-02** (automática) — Coorte é o mês da primeira venda, 12 linhas e 12 colunas. Dado hoje 21/10/2026 e clientes com primeira venda em Out/2025, Mar/2026 e Set/2024, quando as coortes são calculadas, então há 12 linhas, de Nov/2025 a Out/2026, com Mês 0 a Mês 11; o cliente de Set/2024 fica fora; a coorte Mar/2026 tem idade 7 e as células do Mês 8 em diante são "—".
- **CA-B34-03** (automática) — Retenção por mês. Dado a coorte Nov/2025 com 4 clientes, dos quais 1 comprou em Dez/2025 e 2 em Fev/2026, quando a retenção é calculada, então Mês 0 é 100%, Mês 1 é 25%, Mês 2 é 0% e Mês 3 é 50%.
- **CA-B34-04** (automática) — Valor médio de venda por mês. Dado a coorte Nov/2025 com 2 clientes que, em Dez/2025, fizeram três vendas de R$ 100, R$ 200 e R$ 300, quando o valor médio é calculado, então o Mês 1 mostra R$ 200,00 e um mês sem venda mostra "—".
- **CA-B34-07** (automática) — Exportar as tabelas de coorte. Dado a tabela de retenção com 12 coortes, quando o usuário clica em Exportar, então baixa uma planilha com 12 linhas e as colunas Coorte, Clientes e Mês 0 a Mês 11, com os percentuais como número; a tabela de valor médio exporta os valores como moeda.
- **CA-B34-08** (automática) — Atendente vê só os clientes dele na coorte. Dado clientes de dois atendentes, quando um deles, com papel Atendente, abre a aba Coorte, então as coortes só contam os clientes dele.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B34-02 | Mês k de uma coorte só existe se k ≤ idade da coorte (o mês atual, mesmo incompleto, conta); retenção zero entra na média geral e no gráfico de recompra como zero, não é descartada como o Tailor faz. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-05 | "Valor médio de pedido" do Tailor vira "valor médio de venda": por venda, não por cliente. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.
