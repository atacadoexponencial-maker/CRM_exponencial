# B39-02: Exportar pedidos em Excel e CSV

**Tipo:** Implementação
**Página:** Pedidos (`/catalogo/pedidos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-pedidos-exportar-e-filtrar.md`

## Descrição

Botão "Exportar" na tela Pedidos: a pessoa escolhe entre os pedidos filtrados e todos, e baixa Excel (abas Pedidos e Itens), CSV de pedidos ou CSV de itens, no formato do Excel em português.

## Pronto quando

Qualquer papel clica em "Exportar", escolhe "Só os filtrados (N pedidos)" ou "Todos os pedidos" e baixa o Excel com as abas Pedidos e Itens, ou um dos dois CSV, com nome de arquivo que diz o período, só com pedidos da própria empresa.

## Critérios de aceite

- **CA-B39-12** (automática) — Excel com as abas Pedidos e Itens. Dado dois pedidos, um com 2 produtos e outro com 1, quando a pessoa exporta em Excel, então o arquivo tem a aba "Pedidos" com 2 linhas (número, data, cliente, WhatsApp, peças, desconto, total, situação) e a aba "Itens" com 3 linhas (número do pedido, data, cliente, produto, variação, quantidade, preço unitário, subtotal); datas como data e valores como número.
- **CA-B39-13** (automática) — Exportar só os filtrados. Dado 3 pedidos, 1 deles fechado, e o filtro situação "Fechado" ligado, quando a pessoa escolhe "Só os filtrados" e exporta, então o arquivo traz só o pedido fechado (e só os itens dele).
- **CA-B39-14** (automática) — Exportar todos os pedidos. Dado os mesmos 3 pedidos e o filtro "Fechado" ligado, quando a pessoa escolhe "Todos os pedidos" e exporta, então o arquivo traz os 3 pedidos, sem perder o filtro da tela.
- **CA-B39-15** (automática) — CSV que abre certo no Excel em português. Dado um pedido de R$ 1.234,50 da cliente "Conceição", quando a pessoa baixa o CSV de pedidos, então as colunas vêm separadas por ponto e vírgula, o valor aparece como 1234,50, a data como dd/mm/aaaa e o nome com acento certo.
- **CA-B39-16** (automática) — CSV de itens. Dado os dois pedidos do critério do Excel, quando a pessoa baixa o CSV de itens, então o arquivo tem 3 linhas de itens, com as mesmas colunas da aba "Itens".
- **CA-B39-17** (automática) — Todos os papéis exportam, só da própria empresa. Dado um Atendente da empresa A e pedidos nas empresas A e B, quando o Atendente exporta "Todos os pedidos", então o arquivo traz os pedidos da empresa A e nenhum da empresa B.
- **CA-B39-18** (automática) — Nome do arquivo diz o que é. Dado o período Personalizado de 05/10/2026 a 15/10/2026, quando a pessoa exporta os filtrados em Excel, então o arquivo se chama `pedidos-2026-10-05-a-2026-10-15.xlsx`; exportando todos, `pedidos-todos.xlsx`; os CSV seguem o mesmo nome com `-itens` quando for de itens.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B39-02 | O que vai em cada linha da planilha? | respondida | As duas: aba "Pedidos" (uma linha por pedido) e aba "Itens" (uma linha por produto); no CSV, a pessoa escolhe qual baixar. Marcelle, 22/10/2026. |
| PER-B39-03 | A exportação leva só os filtrados ou todos? | respondida | A pessoa escolhe na hora de exportar. Marcelle, 22/10/2026. |
| PER-B39-04 | Quem pode exportar? | respondida | Todos os papéis. Marcelle, 22/10/2026. |
| PER-B39-07 | Em que formato vai o CSV? | respondida | Para o Excel em português: ponto e vírgula entre colunas e vírgula decimal. Marcelle, 22/10/2026. |
