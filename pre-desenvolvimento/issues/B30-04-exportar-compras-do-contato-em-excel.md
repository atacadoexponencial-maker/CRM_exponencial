# B30-04: Exportar o histórico de compras do contato em Excel

**Tipo:** Implementação
**Página:** Perfil do contato (histórico de compras)
**Spec:** `pre-desenvolvimento/spec-fundacao-da-venda.md`

## Descrição

O histórico de compras do perfil ganha o botão "Exportar", que baixa uma planilha Excel
com as mesmas colunas da tabela (Data, Valor, Peças, Desconto, Forma de pagamento,
Atendente, Origem, Pedido), uma linha por compra, na ordem da tela. Contato sem compras
baixa só o cabeçalho. Datas e valores saem reconhecidos como data e número. Atendente só
exporta o que ele já pode ver. Esta é a prova do padrão de exportação que as telas de
relatório seguintes vão repetir.

Depende da B30-01 e da B30-02 (as colunas e as duas origens).

## Pronto quando

No perfil de um contato com três compras, clicar em "Exportar" baixa um arquivo que abre
no Excel e no Google Planilhas com o cabeçalho e as três linhas na ordem da tela, com data
e valor tratados como data e número. Num contato sem compras, baixa só o cabeçalho, sem erro.

## Critérios de aceite

- **CA-B30-13** (automática) — Exportar baixa a planilha com as compras. Dado um contato com três compras no histórico, quando o usuário clica em "Exportar", então baixa um arquivo Excel com cabeçalho (Data, Valor, Peças, Desconto, Forma de pagamento, Atendente, Origem, Pedido) e três linhas, na mesma ordem da tela.
- **CA-B30-14** (automática) — Exportar sem compras gera só o cabeçalho. Dado um contato sem compras, quando o usuário clica em "Exportar", então baixa um arquivo Excel só com o cabeçalho, sem erro.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-09 | A exportação em Excel abre no Excel e no Google Planilhas, com datas e valores reconhecidos como data e número, não como texto. | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
