# B61-02: Categorias em círculos com foto e faixa do atacado

**Tipo:** Implementação
**Página:** Loja pública (vitrine) e Catálogo > Produtos (painel de categorias)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

O lojista envia, troca e remove a foto de cada categoria no painel de categorias. A vitrine mostra as categorias em círculos com foto, além dos chips, e a faixa "Atacado · Mínimo N peças" antes dos produtos.

## Pronto quando

O lojista envia a foto de uma categoria, abre a loja e vê os círculos (com a foto enviada, a do primeiro produto ou a inicial), toca em um e a lista filtra; a faixa do atacado mostra o mínimo e o desconto da loja.

## Critérios de aceite

- **CA-B61-11** (automática) — Cada categoria com produto aparece em um círculo com foto. Dado uma loja com as categorias "Blusas" (foto enviada pelo lojista) e "Calças" (sem foto enviada, com produtos com foto), quando a cliente abre a loja, então ela vê um círculo "Blusas" com a foto enviada e um círculo "Calças" com a foto do primeiro produto visível da categoria.
- **CA-B61-12** (automática) — Categoria sem nenhuma foto mostra a inicial no círculo. Dado uma categoria "Acessórios" sem foto enviada e com produtos sem foto, quando a cliente abre a loja, então o círculo "Acessórios" mostra a letra "A".
- **CA-B61-13** (automática) — Categoria sem produto visível não aparece. Dado uma categoria "Inverno" cujos produtos estão todos ocultos, quando a cliente abre a loja, então "Inverno" não aparece nem nos círculos nem nos chips.
- **CA-B61-14** (automática) — Tocar no círculo filtra pela categoria. Dado uma loja com produtos em "Blusas" e em "Calças", quando a cliente toca no círculo "Blusas", então só os produtos de "Blusas" aparecem, e o círculo e o chip "Blusas" ficam marcados.
- **CA-B61-18** (automática) — A faixa do atacado mostra o pedido mínimo da loja. Dado uma loja com pedido mínimo de 10 peças, quando a cliente abre a loja, então uma faixa antes dos produtos mostra "Atacado · Mínimo 10 peças".
- **CA-B61-19** (automática) — Mínimo em reais e desconto por pedido também entram na faixa. Dado uma loja com pedido mínimo de R$ 300,00 e desconto de 10% a partir de 50 peças, quando a cliente abre a loja, então a faixa mostra "Atacado · Mínimo R$ 300,00" e o aviso do desconto, com o mesmo texto de hoje.
- **CA-B61-20** (automática) — Loja sem mínimo e sem desconto não mostra a faixa. Dado uma loja sem pedido mínimo e sem desconto por pedido, quando a cliente abre a loja, então a faixa do atacado não aparece.
- **CA-B61-54** (automática) — O lojista envia a foto da categoria. Dado a categoria "Blusas" sem foto, quando o lojista envia uma imagem JPG de 1 MB para ela, então a miniatura da categoria passa a mostrar a imagem e a loja pública usa essa foto no círculo "Blusas".
- **CA-B61-55** (automática) — Arquivo que não é imagem ou é grande demais é recusado. Dado a categoria "Blusas", quando o lojista tenta enviar um PDF, ou uma imagem acima do limite que já vale para a logo, então a tela mostra o mesmo aviso que a logo mostra nesses casos e a foto da categoria não muda (a recusa vale também no servidor).
- **CA-B61-56** (automática) — Trocar e remover a foto da categoria. Dado a categoria "Blusas" com foto, quando o lojista envia outra imagem, e depois remove a foto, então depois da troca a loja mostra a imagem nova; depois de remover, o círculo volta a usar a foto do primeiro produto da categoria.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-01 | "Os outros pontos também" foi lido como o recorte recomendado na conversa (topo, categorias, faixa do atacado, cartão, lista contínua, página do produto, rodapé e barra), e não como frete, conta da cliente ou identificação antes do carrinho. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-09 | A foto da categoria segue os mesmos formatos e o mesmo tamanho máximo da logo. | confirmada | Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-04 | Qual foto vai no círculo da categoria? | respondida | A enviada pelo lojista; sem ela, a do primeiro produto da categoria. Marcelle, 10/11/2026. |
