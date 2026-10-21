# B31-02: Desconto por total do pedido

**Tipo:** Implementação
**Página:** Configurações do catálogo (`/catalogo/configuracoes`), vitrine e carrinho (`/loja/[endereco]`), registro do pedido (servidor), compra do contato (B30)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

A loja ganha até 3 linhas de desconto por total de peças do pedido ("a partir de 50
peças no pedido, 10% a menos"), nas configurações do catálogo, abaixo do pedido mínimo.
A vitrine avisa a regra no topo, o carrinho mostra subtotal, linha de desconto e total
(e o que falta para a próxima linha), e o servidor grava o desconto no pedido e na
compra do contato gerada pela B30. O desconto entra sobre o total depois do preço por
faixa de cada produto (B31-01).

Depende da B31-01 (preço da faixa por item).

## Pronto quando

Na empresa de teste, a loja recebe "a partir de 50 peças, 10%". A vitrine mostra "10% a
menos a partir de 50 peças" ao lado do pedido mínimo. Com 49 peças no carrinho aparece
"falta 1 peça para 10% de desconto"; com 50 o carrinho mostra o subtotal, "− R$ 124,50"
e o total R$ 1.120,50. O pedido registrado traz as três linhas na mensagem do WhatsApp
e, fechado no CRM, a compra do contato nasce com esse desconto.

## Critérios de aceite

- **CA-B31-16** (automática) — Desconto por total do pedido salvo e conferido. Dado a loja sem desconto por pedido, quando o lojista salva "a partir de 50 peças, 10%" e "a partir de 100 peças, 15%", então a loja fica com as duas linhas; "a partir de 100, 5%" depois de "50, 10%" (porcentagem que não sobe) ou 0% ou 95% são recusados com aviso.
- **CA-B31-17** (automática) — Desconto do pedido aplicado no carrinho e no servidor. Dado a loja com "a partir de 50 peças, 10%" e um produto a R$ 29,90 com faixa "a partir de 12: R$ 24,90", quando o carrinho tem 50 peças desse produto, então o carrinho mostra 50 × R$ 24,90 = R$ 1.245,00, "desconto de 10% do pedido: − R$ 124,50" e total R$ 1.120,50; o pedido registrado guarda o desconto e a compra do contato (B30) recebe esse desconto; com 49 peças não há desconto e o carrinho avisa "falta 1 peça para 10% de desconto".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-08 | Quando a loja tem desconto por pedido e o produto tem faixa, os dois valem: a faixa dá o unitário e o desconto da loja entra sobre o total. | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | respondida | Marcelle, 21/10/2026: regra do negócio de cada atacadista; o sistema oferece as duas e o lojista escolhe |
