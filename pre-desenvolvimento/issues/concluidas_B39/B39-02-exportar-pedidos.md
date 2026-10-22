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

## Cenários

### Happy Path
1. Na tela Pedidos, a pessoa (qualquer papel) clica em "Exportar". Abre um quadro com a escolha "Só os filtrados (N pedidos)" ou "Todos os pedidos" e três botões: Excel, CSV de pedidos e CSV de itens.
2. Ao escolher o formato, o navegador baixa o arquivo, gerado no servidor com os pedidos da empresa de quem pede. Os filtrados usam os mesmos filtros da tela (B39-01); "Todos" ignora os filtros sem mexer neles na tela.
3. O Excel tem duas abas: "Pedidos" (Número, Data, Cliente, WhatsApp, Peças, Desconto, Total, Situação) e "Itens" (Pedido, Data, Cliente, Produto, Variação, Quantidade, Preço unitário, Subtotal). Datas como data, valores como número.
4. Os CSV têm as mesmas colunas da aba correspondente, separadas por ponto e vírgula, com vírgula decimal (1234,50), data dd/mm/aaaa e acentos certos no Excel em português.

### Edge Cases
- Nome do arquivo: personalizado → `pedidos-AAAA-MM-DD-a-AAAA-MM-DD`; todos → `pedidos-todos`; Hoje → `pedidos-hoje`; 7 e 30 dias → `pedidos-ultimos-7-dias` / `pedidos-ultimos-30-dias`; Tudo filtrado → `pedidos-filtrados`. CSV de itens com `-itens` no fim; extensão `.xlsx` ou `.csv`.
- Mais de 500 pedidos: o servidor junta todas as páginas do filtro (a lista da tela mostra 500 por vez, a exportação leva todos).
- Nenhum pedido no resultado: o arquivo vem só com o cabeçalho.
- Data do pedido é o dia em Brasília (pedido às 23h de 15/10 sai como 15/10).
- Desconto zero sai vazio; variação vazia sai vazia.
- Texto com ponto e vírgula, aspas ou quebra de linha (nome da cliente, produto) vai entre aspas no CSV, sem quebrar as colunas.
- Período personalizado inválido nos filtrados: o servidor responde 400 ("Período inválido.") e nada é baixado; o botão já fica desligado na tela enquanto o período estiver inválido.

### Cenário de Erro
- Sem sessão: 401 "Sessão expirada.".
- Formato ou escopo desconhecido, filtro malformado: 400 com a mensagem.
- Falha do banco: 500 "Não foi possível exportar." e nada é baixado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B39-12 | automática | `src/test/pedidos-exportar.integration.test.ts` | O Excel tem a aba "Pedidos" com 2 linhas e a aba "Itens" com 3, com os títulos da spec, data como data e valores como número |
| CA-B39-13 | automática | `src/test/pedidos-exportar.integration.test.ts` | Com "Fechado" e escopo filtrados, o arquivo traz só o pedido fechado e só os itens dele |
| CA-B39-14 | automática | `src/test/pedidos-exportar.integration.test.ts` | Com "Fechado" mas escopo todos, o arquivo traz os 3 pedidos |
| CA-B39-15 | automática | `src/test/pedidos-exportar.integration.test.ts` | O CSV de pedidos usa ";", traz 1234,50, a data dd/mm/aaaa e "Conceição" com acento (UTF-8 com BOM) |
| CA-B39-16 | automática | `src/test/pedidos-exportar.integration.test.ts` | O CSV de itens tem 3 linhas, com as colunas da aba "Itens" |
| CA-B39-17 | automática | `src/test/pedidos-exportar.integration.test.ts` | O Atendente da empresa A exporta todos e recebe os pedidos de A e nenhum de B |
| CA-B39-18 | automática | `src/test/pedidos-exportar.integration.test.ts` | Personalizado 05/10–15/10 baixa `pedidos-2026-10-05-a-2026-10-15.xlsx`; todos baixa `pedidos-todos.xlsx`; CSV de itens termina em `-itens.csv` |

## Banco de Dados

Nada novo: usa `filtrar_pedidos` (B39-01) e lê `catalog_order_items` pela RLS que já existe (membros da empresa leem os itens dos pedidos dela).

## Arquivos

- **Modificar:** `src/lib/exportar-planilha.ts` — `gerarPlanilhaComAbas` (várias abas; `gerarPlanilha` passa a usá-la, sem mudar o que faz), `gerarCsv` (";" entre colunas, vírgula decimal, data dd/mm/aaaa, aspas quando precisa, BOM) e `respostaCsv`.
- **Criar:** `src/lib/catalogo/exportar-pedidos.ts` — colunas das abas Pedidos e Itens, dia do pedido em Brasília, nome do arquivo, e leitura/escrita dos filtros na URL (`filtrosDaUrl`, `urlDaExportacao`).
- **Modificar:** `src/app/(auth)/catalogo/pedidos/actions.ts` — `pedidosParaExportar(filtros | null)`: junta todas as páginas de `filtrar_pedidos` (null = todos) e os itens desses pedidos.
- **Criar:** `src/app/(auth)/catalogo/pedidos/exportar/route.ts` — GET que valida formato, escopo e filtros e devolve o .xlsx ou o .csv.
- **Criar:** `src/app/(auth)/catalogo/components/exportar-pedidos.tsx` — botão "Exportar" e o quadro com a escolha e os três formatos.
- **Modificar:** `src/app/(auth)/catalogo/pedidos/pedidos-client.tsx` — mostra o botão "Exportar" com os filtros e o total atuais.
- **Criar:** `src/test/pedidos-exportar.integration.test.ts` — CA-B39-12 a 18.

## Checklist

- [x] `exportar-planilha.ts` com várias abas e CSV, sem quebrar as exportações que já existem
- [x] `exportar-pedidos.ts` com colunas, nome do arquivo e filtros na URL
- [x] `pedidosParaExportar` juntando todas as páginas e os itens
- [x] Rota `exportar` com Excel, CSV de pedidos e CSV de itens
- [x] Botão "Exportar" e quadro de escolha na tela Pedidos
- [x] Testes da tabela Prova escritos e passando
- [x] `tsc --noEmit`, lint, build e os testes das exportações antigas passando
