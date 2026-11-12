# B61-05: Lista única de produtos que carrega ao rolar

**Tipo:** Implementação
**Página:** Loja pública (vitrine)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

No modelo "grade", os produtos deixam de aparecer em seções por categoria com "Ver mais" e passam a formar uma lista só, que carrega de 24 em 24 ao rolar. "Lista" e "destaque" mantêm os cartões e as seções de hoje.

## Pronto quando

A cliente abre uma loja com 60 produtos no modelo "grade", rola e vê os produtos chegando sem tocar em nada; busca, ordena e filtra sobre a lista inteira; abre um produto, volta e cai no mesmo ponto. Lojas em "lista" e "destaque" seguem como antes.

## Critérios de aceite

- **CA-B61-34** (automática) — Os produtos formam uma lista só, sem título de categoria. Dado uma loja no modelo "grade" com produtos em duas categorias e produtos sem categoria, quando a cliente abre a loja sem escolher categoria, então todos aparecem em uma lista só, na ordem do lojista, sem os títulos das categorias e sem "Mais produtos".
- **CA-B61-35** (automática) — A lista carrega mais produtos ao rolar. Dado uma loja com 60 produtos visíveis, quando a cliente abre a loja e rola até o fim dos primeiros 24, então mais 24 aparecem sem ela tocar em nada, e o botão "Ver mais" não existe mais.
- **CA-B61-36** (automática) — Busca, ordenação e "Só com estoque" valem para a lista inteira. Dado uma loja com 60 produtos, em que só o 50º tem "veludo" no nome, quando a cliente busca "veludo", então o produto aparece, mesmo sem ela ter rolado até ele.
- **CA-B61-37** (automática) — Voltar do produto devolve a cliente ao mesmo ponto. Dado a cliente com a categoria "Blusas" escolhida, depois de rolar até o 40º produto, quando ela abre esse produto e volta, então a lista está com "Blusas" escolhida, com o 40º produto carregado e na mesma altura da tela.
- **CA-B61-38** (automática) — "Lista" e "destaque" continuam com os cartões de hoje. Dado uma loja no modelo "lista" e outra no modelo "destaque", quando a cliente abre cada uma, então os produtos aparecem com os cartões e as seções por categoria de antes desta mudança, abaixo do topo, das categorias e da faixa novos.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-08 | A lista contínua vale só no modelo "grade"; ela carrega de 24 em 24. | confirmada | Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-01 | O visual novo substitui o modelo "grade", vira o único modelo ou entra como quarto modelo? | respondida | Substitui a "grade"; "lista" e "destaque" continuam. Marcelle, 10/11/2026. |
