# B61-04: Cartão em retrato com REF, tamanhos e selo "Últimas unidades!"

**Tipo:** Implementação
**Página:** Loja pública (vitrine), Catálogo > Configurações e Catálogo > Aparência (prévia)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

No modelo "grade", o cartão do produto passa a ter foto em retrato, "REF", as opções do primeiro tipo de variação em quadradinhos (a esgotada riscada) e o selo "Últimas unidades!", cujo limite o lojista define nas Configurações. A prévia da Aparência mostra o visual novo.

## Pronto quando

O lojista define o limite do selo, abre a loja no modelo "grade" e vê os cartões em retrato com "REF", tamanhos, selo no produto com pouco estoque e as regras de venda de sempre; tocar no cartão abre o produto; a prévia da Aparência mostra o mesmo.

## Critérios de aceite

- **CA-B61-21** (manual) — O cartão mostra a foto em retrato. Dado uma loja no modelo "grade" com produtos com foto, aberta no celular, quando a Marcelle olha a lista, então cada foto aparece mais alta do que larga (proporção 4 por 5), sem distorcer, em duas colunas.
- **CA-B61-22** (automática) — O cartão mostra o código do produto. Dado um produto com o código "00001090", quando a cliente vê o cartão dele, então o cartão mostra "REF: 00001090" acima do nome.
- **CA-B61-23** (automática) — Produto sem código não mostra "REF". Dado um produto sem código, quando a cliente vê o cartão dele, então o cartão não mostra a linha "REF".
- **CA-B61-24** (automática) — O cartão mostra as opções, com a esgotada riscada. Dado um produto com tamanhos P, M e G, em que M está sem estoque, quando a cliente vê o cartão dele, então o cartão mostra P, M e G em quadradinhos, com M riscado.
- **CA-B61-25** (automática) — Produto com dois tipos de variação mostra o primeiro e conta o segundo. Dado um produto com Tamanho (P, M) e Cor (Preto, Branco), com Tamanho em primeiro, quando a cliente vê o cartão dele, então o cartão mostra P e M em quadradinhos e o texto "2 opções de cor".
- **CA-B61-26** (automática) — Opção só conta como esgotada quando não há estoque em nenhuma combinação. Dado um produto com Tamanho e Cor em que o P tem estoque só na cor Preto, quando a cliente vê o cartão dele, então o P aparece sem risco.
- **CA-B61-27** (automática) — Produto sem variação não mostra quadradinhos. Dado um produto sem variação, quando a cliente vê o cartão dele, então o cartão não mostra quadradinhos de opção.
- **CA-B61-28** (automática) — O selo "Últimas unidades!" aparece no limite que o lojista definiu. Dado uma loja com o selo configurado para 5 peças, um produto com 5 peças no total e outro com 6, quando a cliente abre a loja, então o cartão do produto com 5 peças mostra "Últimas unidades!" e o do produto com 6 não mostra.
- **CA-B61-29** (automática) — Produto esgotado mostra "Esgotado", não "Últimas unidades!". Dado uma loja com o selo configurado para 5 peças e um produto sem estoque, quando a cliente abre a loja, então o cartão dele mostra só "Esgotado".
- **CA-B61-30** (automática) — Sem limite configurado, nenhum cartão mostra o selo. Dado uma loja com o campo do selo vazio e um produto com 1 peça, quando a cliente abre a loja, então nenhum cartão mostra "Últimas unidades!".
- **CA-B61-31** (automática) — As regras de venda continuam no cartão. Dado um produto com grade fechada de 12 peças e outro com faixa de preço e mínimo de 6 peças, quando a cliente vê os cartões, então cada cartão mostra o mesmo resumo de regras que mostrava antes desta mudança.
- **CA-B61-32** (automática) — O preço continua com vírgula. Dado um produto de R$ 14,99, quando a cliente vê o cartão dele, então o preço aparece como "R$ 14,99".
- **CA-B61-33** (automática) — Tocar no cartão abre o produto. Dado a lista de produtos, quando a cliente toca na foto, no nome ou em um quadradinho de opção de um cartão, então a página daquele produto abre, e nada é adicionado ao carrinho.
- **CA-B61-39** (automática) — A prévia da Aparência mostra o visual novo. Dado o lojista na tela de Aparência do catálogo, com o modelo "grade", quando ele olha a prévia, então ela mostra o topo com a logo redonda, os círculos de categoria e os cartões em retrato, iguais aos da loja pública.
- **CA-B61-67** (automática) — O lojista define o limite do selo. Dado o lojista na tela de Configurações do catálogo, quando ele digita 5 no campo do selo e salva, então a tela confirma que salvou e, na loja, os produtos com 5 peças ou menos no total passam a mostrar "Últimas unidades!".
- **CA-B61-68** (automática) — Limite inválido é recusado. Dado o campo do selo, quando o lojista digita 0, um número negativo, um número com vírgula ou um número acima de 999 e salva, então a tela avisa "Use um número inteiro de 1 a 999, ou deixe vazio para não mostrar o selo." e nada é gravado (a recusa vale também no servidor).
- **CA-B61-69** (automática) — Campo vazio desliga o selo. Dado uma loja com o selo em 5 peças, quando o lojista apaga o campo e salva, então nenhum cartão da loja mostra "Últimas unidades!".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-02 | Os quadradinhos de opção no cartão são só informação: tocar neles abre o produto. Na referência eles escolhem o tamanho para comprar pelo cartão, o que ficou fora. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-03 | O cartão mostra em quadradinhos o primeiro tipo de variação do produto (o que o lojista cadastrou primeiro) e resume o segundo em texto ("2 opções de cor"). | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-04 | "Últimas unidades!" conta o estoque total do produto, somando todas as combinações, e não cada tamanho em separado. | confirmada | Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-01 | O visual novo substitui o modelo "grade", vira o único modelo ou entra como quarto modelo? | respondida | Substitui a "grade"; "lista" e "destaque" continuam. Marcelle, 10/11/2026. |
| PER-B61-02 | Quando o selo "Últimas unidades!" aparece? | respondida | O lojista define o número de peças nas configurações; vazio desliga. Marcelle, 10/11/2026. |
