# B44-08: Planilha forjada recusada e CSV de pedidos sem fórmula

**Tipo:** Implementação
**Página:** Catálogo → importar e pedidos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

A importação de produtos recusa, antes de ler, o arquivo que declara mais linhas que o limite de hoje, e o CSV de pedidos marca como texto as células que começam com =, +, - ou @.

## Pronto quando

Um arquivo de poucos KB que declara milhões de linhas é recusado em segundos com aviso, a planilha modelo continua importando, e um pedido com nome `=1+1` aparece como texto no CSV.

## Critérios de aceite

- **CA-B44-29** (automática) — Planilha que declara tamanho gigante é recusada sem travar. Dado um arquivo de planilha pequeno (poucos KB) que declara muito mais que 1.000 linhas, quando o Gerente importa esse arquivo, então a tela avisa em poucos segundos que a planilha passa do limite de 1.000 produtos, e nada é importado
- **CA-B44-30** (automática) — Planilha normal continua importando. Dado a planilha modelo preenchida com 3 produtos, quando o Gerente importa, então a prévia mostra os 3 produtos, como hoje
- **CA-B44-31** (automática) — CSV de pedidos não vira fórmula. Dado um pedido da loja feito com o nome `=1+1` (ou começando com `+`, `-` ou `@`), quando o Gerente exporta os pedidos em CSV, então a célula do cliente mostra o texto `=1+1`, não o resultado 2 (o CSV marca a célula como texto)

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-05 | Limite da planilha importada: até 1.000 linhas (como hoje) e até 50 colunas. Uma planilha que declara mais do que isso é recusada antes de ser lida | invalidada | Marcelle, 27/10/2026: não criar limite novo. Fica o de hoje (1.000 linhas de produto, só a importação do catálogo) e **nenhum limite de colunas**. A série só recusa o arquivo que declara mais linhas do que o limite de hoje antes de ser lido (CA-B44-29) |

## Perguntas em aberto

Nenhuma.
