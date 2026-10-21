# B32-06: Variação por UF, 25 meses e aprovação visual

**Tipo:** Implementação
**Página:** Relatórios (`/relatorios`), aba Visão Geral
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

Fecham a Visão Geral os dois últimos blocos: a tabela "Variação em relação ao ano anterior" por UF do contato (clientes, crescimento de clientes, vendas, crescimento de vendas, ticket médio, linha de total, ordenação por coluna, "Sem UF", Exportar Excel, comparação justa D-1) e o gráfico dos últimos 25 meses com a variação contra o mesmo mês do ano anterior, que ignora o filtro de período e segue o de atendente. Com a aba completa, a Marcelle aprova a tela em produção, no computador e no celular. Depende da B32-02 (UF) e da B32-03.

## Pronto quando

Na empresa de teste, com vendas semeadas em meses e UFs diferentes, a tabela por UF mostra os crescimentos certos e exporta; o gráfico vai do mês de dois anos atrás até o atual, com a variação de cada mês. A Marcelle abre /relatorios em produção e aprova os blocos na ordem da spec, legíveis no tema escuro.

## Critérios de aceite

- **CA-B32-19** (automática) — Linhas por UF com crescimento. Dado neste período 2 clientes de "PE" faturando R$ 1.000 e, no mesmo período do ano passado, 1 cliente de "PE" faturando R$ 800, quando a tabela é calculada, então a linha PE mostra clientes 2, crescimento de clientes +100,00%, vendas R$ 1.000,00, crescimento de vendas +25,00% e ticket médio R$ 500,00; o total repete os mesmos números.
- **CA-B32-20** (automática) — Exportar a variação por UF. Dado a tabela com 2 UFs, quando o usuário clica em Exportar Excel, então baixa uma planilha com as 2 linhas, a linha de total e as mesmas colunas.
- **CA-B32-21** (automática) — 25 meses com variação anual. Dado hoje é 21/10/2026, com R$ 500 em Out/2025 e R$ 600 em Out/2026 até o dia 20, quando o gráfico é calculado, então ele vai de Out/2024 a Out/2026, com 25 meses, e Out/2026 mostra R$ 600,00 com variação +20,0%.
- **CA-B32-23** (manual) — A Visão Geral aprovada pela Marcelle em produção. Dado a empresa "[TESTE] Automações B11" com vendas semeadas em meses diferentes, quando a Marcelle abre `/relatorios` em produção, no computador e no celular, então os blocos aparecem na ordem da spec, legíveis no tema escuro, e os números batem com as vendas semeadas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-05 | A tabela "Variação em relação ao ano anterior" do Tailor é por região; no CRM ela agrupa pela cidade do contato, que é o que existe. | invalidada | O contato ganha o campo UF e a tabela agrupa por UF, como no Tailor. Marcelle, 21/10/2026 |
| SUP-B32-08 | O gráfico de 25 meses e a projeção seguem o filtro de atendente; só ignoram o de período. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-01 | O comparativo "vs ano passado" compara com o mesmo mês do ano anterior (Out/2025 contra Out/2026). Confirma? A alternativa seria o acumulado do ano. | respondida | Sim, mesmo mês do ano anterior. Marcelle, 21/10/2026 |
