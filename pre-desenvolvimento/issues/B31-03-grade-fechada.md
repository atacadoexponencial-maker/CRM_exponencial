# B31-03: Grade fechada

**Tipo:** Implementação
**Página:** Editor de produto (`/catalogo`), página do produto e carrinho (`/loja/[endereco]`), registro do pedido (servidor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

Produto com variação pode ser vendido só em grade fechada: o lojista liga o interruptor,
dá uma quantidade por opção do primeiro tipo (ex.: P 1, M 2, G 2, GG 1) e, se quiser, um
preço próprio da grade (vazio = soma das peças). Na loja, a página do produto troca a
grade de quantidades livre por um contador de pacotes por bloco (cor); cada pacote vira
as linhas da grade no carrinho, mostradas como "2 grades · 12 peças". O servidor recusa
pedido cujas quantidades não são múltiplos exatos da grade por bloco e põe "2 grades
(12 peças)" na mensagem. Com as três regras no ar, a Marcelle confere no celular o aviso
de cada uma no cartão e na página.

Depende da B31-01 (o preço da faixa e o mínimo já existem no editor e no carrinho).

## Pronto quando

Na empresa de teste, a camiseta (P, M, G, GG × Azul, Preto) fica com grade P 1, M 2, G 2,
GG 1. Na loja, a página mostra a grade e um contador por cor; pedir 2 de Azul e 1 de
Preto põe no carrinho "2 grades · 12 peças" e "1 grade · 6 peças", por R$ 179,40 a grade
ou pelo preço próprio quando preenchido. Preto sem estoque para um pacote inteiro
aparece indisponível. Um pedido forçado com G 3 em Azul é recusado pelo servidor.

## Critérios de aceite

- **CA-B31-03** (automática) — Grade fechada salva. Dado um produto com Tamanho (P, M, G, GG) e Cor (Azul, Preto), quando o lojista liga a grade fechada com P 1, M 2, G 2, GG 1, então o produto fica com a grade de 6 peças; produto sem variação não aceita grade fechada; grade com todas as quantidades zero é recusada.
- **CA-B31-15** (automática) — Preço próprio da grade. Dado o produto com grade de 6 peças a R$ 29,90 cada, quando o lojista preenche "preço da grade" R$ 150,00, então a página do produto, o carrinho e a mensagem do pedido mostram a grade por R$ 150,00 (R$ 25,00 a peça); com o campo vazio, R$ 179,40; preço zero ou negativo é recusado.
- **CA-B31-07** (automática) — Grade fechada na página do produto. Dado o produto com grade P 1, M 2, G 2, GG 1 nas cores Azul e Preto, quando a cliente pede 2 pacotes de Azul e 1 de Preto, então o carrinho recebe P 2, M 4, G 4, GG 2 em Azul e P 1, M 2, G 2, GG 1 em Preto, mostrados como "2 grades · 12 peças" e "1 grade · 6 peças"; a cor cujo estoque não fecha um pacote inteiro aparece indisponível.
- **CA-B31-13** (automática) — Grade fechada conferida no servidor. Dado o produto com grade P 1, M 2, G 2, GG 1, quando chega um pedido com P 2, M 4, G 3, GG 2 em Azul, então o pedido é recusado dizendo que a grade de Azul está quebrada; com P 2, M 4, G 4, GG 2 sai, e a mensagem traz "2 grades (12 peças)" em Azul.
- **CA-B31-09** (manual) — Aviso das regras no cartão e na página. Dado a loja de teste com um produto de cada regra, quando a Marcelle abre a vitrine no celular, então cada cartão e cada página mostra a regra em uma linha curta, legível, sem empurrar o preço para fora do cartão.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-03 | A grade fechada é definida sobre o primeiro tipo de variação (normalmente o tamanho) e repetida por opção do segundo (cor); produto com um tipo só tem um bloco. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-04 | Produto com grade fechada não aceita compra avulsa: só pacotes inteiros. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-05 | Sem preço próprio, o pacote custa a soma das peças pelo unitário (com faixa, se houver). | confirmada | Marcelle, 21/10/2026: o lojista pode dar preço próprio (CA-B31-15) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-02 | Grade fechada: o lojista precisa de preço próprio para o pacote (ex.: "grade de 6 por R$ 150"), ou basta a soma das peças (SUP-B31-05)? | respondida | Marcelle, 21/10/2026: idem; preço próprio opcional, senão a soma |
