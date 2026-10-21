# B31-05: Repetir o último pedido

**Tipo:** Implementação
**Página:** Vitrine e carrinho (`/loja/[endereco]`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

Depois de um pedido registrado, as peças dele ficam guardadas no aparelho da cliente,
como o carrinho. Ao voltar à loja, ela vê "Repetir último pedido" no cabeçalho e no
carrinho vazio; tocar monta o carrinho com as peças que ainda existem e têm estoque
(quantidades limitadas ao estoque de hoje, preço e regras de hoje) e a tela diz o que
ficou de fora e por quê.

Independente das outras issues da série (não depende das regras de venda).

## Pronto quando

Na empresa de teste, uma cliente faz um pedido com 3 produtos; o lojista oculta um deles.
Ela volta à loja no mesmo navegador, toca "Repetir último pedido" e o carrinho fica com
os 2 produtos nas quantidades de antes, com a mensagem "Regata canelada ficou de fora:
saiu da loja".

## Critérios de aceite

- **CA-B31-08** (automática) — Repetir o último pedido. Dado uma cliente que fez um pedido neste aparelho com 3 produtos, um deles depois oculto pelo lojista, quando ela toca "Repetir último pedido", então o carrinho fica com os 2 produtos que ainda existem, nas quantidades de antes (limitadas ao estoque de hoje), e a tela diz qual ficou de fora e por quê.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-06 | "Repetir último pedido" vale para o aparelho em que o pedido foi feito (a loja não tem login); o último pedido fica guardado no aparelho, como o carrinho. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-03 | Repetir pedido: só no aparelho da cliente (SUP-B31-06) é suficiente agora, ou já quer o link que o vendedor manda pelo CRM ("repetir pedido #12") abrindo a loja com o carrinho montado? | respondida | Marcelle, 21/10/2026: só no aparelho |
