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

## Cenários

### Happy Path
1. A cliente abre uma loja no modelo "grade" com 60 produtos: aparecem os 24 primeiros, em uma lista só, na ordem do lojista, sem título de categoria.
2. Ao rolar até perto do fim, mais 24 aparecem sozinhos; depois, os 12 que faltam.
3. Ela busca "veludo": o 50º produto aparece sem ela ter rolado até ele.
4. Com "Blusas" escolhida e 48 produtos carregados, ela abre o 40º e volta: a lista reabre com "Blusas", os 48 carregados e a mesma rolagem.

### Edge Cases
- Loja com 24 produtos ou menos: tudo aparece de uma vez, sem marco de carga.
- Trocar categoria, subcategoria, busca, ordem ou "Só com estoque": a lista volta a mostrar os 24 primeiros do resultado.
- Modelos "lista" e "destaque": seções por categoria, "Mais produtos" e "Ver mais", como antes.
- Nenhum produto no filtro: "Nenhum produto encontrado."

### Cenário de Erro
- Armazenamento do aparelho indisponível: a loja abre do começo, sem o filtro e a rolagem guardados (como já era).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-34 | automática | `src/test/loja-lista-continua.test.tsx` | no modelo "grade", os produtos de duas categorias e os sem categoria aparecem em uma lista só, na ordem do lojista, sem os títulos das categorias e sem "Mais produtos" |
| CA-B61-35 | automática | `src/test/loja-lista-continua.test.tsx` | com 60 produtos, aparecem 24; quando o fim da lista chega à tela, aparecem 48, sem toque, e não existe botão "Ver mais" |
| CA-B61-36 | automática | `src/test/loja-lista-continua.test.tsx` | com 24 na tela, buscar "veludo" mostra o 50º produto; ordenar e "Só com estoque" trazem produtos que estavam além dos 24 |
| CA-B61-37 | automática | `src/test/loja-lista-continua.test.tsx` | com "Blusas" escolhida e a lista carregada até o 40º, abrir o produto e voltar reabre com "Blusas" marcada, o 40º produto na lista e a rolagem na mesma altura |
| CA-B61-38 | automática | `src/test/loja-lista-continua.test.tsx` | em "lista" e em "destaque", os produtos aparecem em seções com o título da categoria, "Mais produtos" e "Ver mais", com os cartões de antes, abaixo do topo, dos círculos e da faixa |

## Arquivos

- **Criar:** `src/test/loja-lista-continua.test.tsx` — testes de tela da lista única, da carga ao rolar, dos filtros, da volta do produto e dos modelos "lista" e "destaque"
- **Modificar:** `src/app/loja/components/vitrine.tsx` — no modelo "grade", lista única que carrega de 24 em 24 ao rolar e guarda quantos estavam carregados para a volta do produto

Reuso: `LIMITE_POR_SECAO` (24) de `src/lib/catalogo/vitrine.ts`; o guarda de filtro e rolagem em `sessionStorage` que a vitrine já tem; `CartaoRetrato` da B61-04.

## Checklist

- [x] Lista única no modelo "grade", sem títulos de categoria e sem "Ver mais"
- [x] Carga de 24 em 24 quando o fim da lista se aproxima da tela
- [x] Quantidade carregada guardada e devolvida na volta do produto
- [x] "Lista" e "destaque" sem mudança
- [x] Testes da tabela Prova escritos e passando
- [x] `npx tsc --noEmit` e lint dos arquivos da issue limpos
