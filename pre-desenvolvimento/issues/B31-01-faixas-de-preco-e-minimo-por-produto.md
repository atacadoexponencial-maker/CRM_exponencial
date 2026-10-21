# B31-01: Faixas de preço e mínimo por produto

**Tipo:** Implementação
**Página:** Editor de produto (`/catalogo`), vitrine e carrinho (`/loja/[endereco]`), registro do pedido (servidor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-regras-de-venda-do-catalogo.md`

## Descrição

O produto ganha até 3 faixas de preço ("a partir de N peças, R$ X") e um mínimo de peças
por pedido, ambos opcionais, cadastrados no editor do produto. A vitrine mostra as
regras no cartão e na página, o carrinho aplica o preço da faixa alcançada (somando
cores e tamanhos do mesmo produto) e avisa o que falta para a próxima faixa e para o
mínimo. O servidor grava o unitário da faixa, confere o mínimo por produto e recusa
preço do navegador que não bate (como no QA A9). Produto sem regra continua como na B16.

## Pronto quando

Na empresa de teste, a camiseta de R$ 29,90 recebe a faixa "a partir de 12: R$ 24,90" e
mínimo 6. Na loja, o cartão e a página mostram as duas regras; escolher 4 peças avisa o
mínimo e não adiciona; com 8 no carrinho o unitário é R$ 29,90 e aparece "faltam 4 peças
para R$ 24,90"; com 12 cai para R$ 24,90 em todas as linhas. O pedido registrado traz
R$ 24,90 na mensagem do WhatsApp; um pedido forçado com 4 peças é recusado pelo servidor.

## Critérios de aceite

- **CA-B31-01** (automática) — Faixas de preço salvas e conferidas. Dado um produto com preço R$ 29,90, quando o lojista salva as faixas "a partir de 12: R$ 24,90" e "a partir de 48: R$ 21,90", então o produto fica com as duas faixas, e salvar "a partir de 12: R$ 31,00" (acima do preço base) ou "a partir de 48: R$ 25,00" depois de "a partir de 12: R$ 24,90" (preço que não desce) é recusado com aviso.
- **CA-B31-02** (automática) — Mínimo por produto salvo. Dado um produto sem mínimo, quando o lojista salva mínimo 6, então o produto fica com mínimo 6; salvar 0 ou texto é recusado; limpar o campo volta a "sem mínimo".
- **CA-B31-05** (automática) — Preço da faixa aplicado no carrinho. Dado o produto com faixa "a partir de 12: R$ 24,90", quando o carrinho tem 8 peças dele (4 azuis e 4 pretas) e a cliente sobe para 12, então o unitário mostrado passa de R$ 29,90 para R$ 24,90 em todas as linhas do produto, e com 8 o carrinho avisa "faltam 4 peças para R$ 24,90".
- **CA-B31-06** (automática) — Mínimo por produto avisado na vitrine. Dado o produto com mínimo 6, quando a cliente escolhe 4 peças na página do produto, então o botão avisa "mínimo 6 peças" e não adiciona; com 6 ou mais adiciona; se o carrinho ficar com 4 (depois de diminuir), a linha avisa e "Fazer pedido" não segue.
- **CA-B31-10** (automática) — Pedido gravado com o preço da faixa. Dado o produto com faixa "a partir de 12: R$ 24,90", quando a loja registra um pedido com 12 peças dele, então os itens ficam com unitário R$ 24,90, a mensagem traz R$ 24,90 e o total de R$ 298,80; com 11 peças fica R$ 29,90.
- **CA-B31-11** (automática) — Preço enviado pelo navegador não vale. Dado o mesmo produto, quando o navegador manda 12 peças dizendo que viu R$ 24,90, mas o lojista tirou a faixa antes de o pedido chegar, então o pedido não sai, avisa que o preço mudou e devolve R$ 29,90 (como no QA A9).
- **CA-B31-12** (automática) — Mínimo por produto conferido no servidor. Dado o produto com mínimo 6, quando chega um pedido com 4 peças dele, ainda que o mínimo da loja esteja batido, então o pedido é recusado dizendo "Camiseta: mínimo 6 peças".
- **CA-B31-14** (automática) — Regras não valem para quem não as tem. Dado uma loja com produtos sem nenhuma regra, quando chega um pedido como hoje, então tudo segue igual à B16: preço base, qualquer quantidade, só o mínimo da loja.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B31-01 | A faixa de preço do produto conta as peças do mesmo produto somando todas as combinações (cores e tamanhos). | confirmada | Marcelle, 21/10/2026: é uma das duas formas; a outra é o desconto por total do pedido (CA-B31-16) |
| SUP-B31-02 | O mínimo por produto é em peças, somando todas as combinações. | confirmada | Marcelle, 21/10/2026 |
| SUP-B31-07 | No máximo 3 faixas de preço por produto e 3 linhas de desconto por pedido na loja. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B31-01 | A faixa de preço deve contar as peças do produto (SUP-B31-01) ou o total de peças do pedido, como fazem algumas marcas ("acima de 50 peças, tudo com 10% a menos")? | respondida | Marcelle, 21/10/2026: regra do negócio de cada atacadista; o sistema oferece as duas e o lojista escolhe |
