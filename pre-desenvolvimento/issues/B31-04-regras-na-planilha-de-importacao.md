# B31-04: Regras de venda na planilha de importação

**Tipo:** Implementação
**Página:** Importar produtos por planilha (`/catalogo`, B18)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

O modelo de planilha da B18 ganha três colunas opcionais: faixas de preço
("12=24,90;48=21,90"), mínimo por produto e grade fechada ("P1 M2 G2 GG1"). A prévia
da importação lê as colunas, mostra o erro na linha com regra inválida sem travar as
outras, e o produto importado nasce com as regras, com as mesmas conferências do editor.

Depende da B31-01 e da B31-03 (as regras existem no produto).

## Pronto quando

Na empresa de teste, baixar o modelo traz as três colunas novas. Importar uma planilha
com uma linha completa cria o produto com faixas, mínimo e grade; uma linha com
"12=31,00" (acima do preço) aparece na prévia como erro só daquela linha, e as outras
entram.

## Critérios de aceite

- **CA-B31-04** (automática) — Regras na planilha de importação. Dado o modelo de planilha da B18 com as colunas opcionais de faixas de preço, mínimo e grade, quando o lojista importa uma linha com "12=24,90;48=21,90", mínimo 6 e grade "P1 M2 G2 GG1", então o produto nasce com as três regras, e linha com faixa inválida aparece na prévia como erro daquela linha, sem travar as outras.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
