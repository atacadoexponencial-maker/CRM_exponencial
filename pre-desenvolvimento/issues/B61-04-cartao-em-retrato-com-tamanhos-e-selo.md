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

## Cenários

### Happy Path
1. O lojista abre Catálogo > Configurações, digita 5 em "Mostrar com quantas peças ou menos" e salva; a tela confirma.
2. A cliente abre a loja no modelo "grade": cada cartão tem a foto em retrato, "REF: código" acima do nome, o preço, os quadradinhos do primeiro tipo de variação (a opção sem estoque riscada), o resumo do segundo tipo ("2 opções de cor") e as regras de venda.
3. O produto com 5 peças ou menos no total mostra "Últimas unidades!" sobre a foto; o esgotado mostra só "Esgotado".
4. Tocar em qualquer parte do cartão abre a página do produto.
5. Na Aparência, a prévia do modelo "grade" mostra o mesmo cartão.

### Edge Cases
- Produto sem código: sem a linha "REF".
- Produto sem variação: sem quadradinhos.
- Produto com dois tipos: a opção do primeiro só é riscada quando nenhuma combinação dela tem estoque.
- Campo do selo vazio: nenhum cartão mostra o selo.
- Modelos "lista" e "destaque": continuam com os cartões de hoje (o selo e os quadradinhos são só do modelo "grade").

### Cenário de Erro
- Limite 0, negativo, com vírgula ou acima de 999: o servidor recusa com "Use um número inteiro de 1 a 999, ou deixe vazio para não mostrar o selo.", a tela mostra o aviso e nada é gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-21 | manual | roteiro abaixo | no celular, as fotos aparecem em retrato (4 por 5), sem distorcer, em duas colunas |
| CA-B61-22 | automática | `src/test/loja-cartao.test.tsx` | o cartão mostra "REF: 00001090" antes do nome |
| CA-B61-23 | automática | `src/test/loja-cartao.test.tsx` | o cartão do produto sem código não tem a linha "REF" |
| CA-B61-24 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | a loja pública entrega P, M e G com M esgotado; o cartão mostra os três quadradinhos e só o M riscado |
| CA-B61-25 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | a loja pública entrega P e M e o texto "2 opções de cor"; o cartão mostra os dois quadradinhos e o texto |
| CA-B61-26 | automática | `src/test/loja-cartao.integration.test.ts` | com estoque do P só na cor Preto, a loja pública entrega o P como não esgotado |
| CA-B61-27 | automática | `src/test/loja-cartao.test.tsx` | o cartão do produto sem variação não tem quadradinho |
| CA-B61-28 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | com o selo em 5, a loja pública marca o produto com 5 peças e não o de 6; o cartão marcado mostra "Últimas unidades!" e o outro não |
| CA-B61-29 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | o produto sem estoque vem esgotado e sem o selo; o cartão mostra "Esgotado" e não "Últimas unidades!" |
| CA-B61-30 | automática | `src/test/loja-cartao.integration.test.ts` | sem limite gravado, o produto com 1 peça existe na loja e nenhum produto vem com o selo |
| CA-B61-31 | automática | `src/test/loja-cartao.test.tsx` | os cartões mostram "Grade fechada de 12 peças" e "A partir de 6: R$ 9,90 · mínimo 6 peças" |
| CA-B61-32 | automática | `src/test/loja-cartao.test.tsx` | o preço aparece como "R$ 14,99" |
| CA-B61-33 | automática | `src/test/loja-cartao.test.tsx` | foto, nome e quadradinho estão dentro do link da página do produto, o toque em cada um abre o produto e o carrinho não é chamado |
| CA-B61-39 | automática | `src/test/loja-cartao.test.tsx` | a prévia da Aparência no modelo "grade" tem a logo redonda, os círculos de categoria e os cartões em retrato |
| CA-B61-67 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | salvar 5 grava o limite, a tela de Configurações reabre com 5 e a loja passa a marcar os produtos com 5 peças ou menos; a tela manda o que foi digitado e mostra a confirmação |
| CA-B61-68 | automática | `src/test/loja-cartao.integration.test.ts` e `src/test/loja-cartao.test.tsx` | o servidor recusa 0, -3, 2,5 e 1000 com o aviso e o limite gravado não muda; a tela mostra o aviso |
| CA-B61-69 | automática | `src/test/loja-cartao.integration.test.ts` | com o selo em 5, salvar o campo vazio zera o limite e nenhum produto da loja vem com o selo |

### Roteiro manual — CA-B61-21
1. No celular, abra o preview da Vercel em `/loja/teste-b11` (a loja precisa estar no modelo "grade", em Catálogo > Aparência, e ter produtos com foto).
2. Olhe a lista de produtos: cada foto deve aparecer mais alta do que larga (4 por 5), sem esticar nem achatar, em duas colunas.

## Banco de Dados

- Tabela: `catalog_settings`
  - `low_stock_limit` (smallint, pode ser nulo, de 1 a 999) — com quantas peças ou menos, no total do produto, o cartão mostra "Últimas unidades!"; nulo desliga o selo

## Arquivos

- **Criar:** `supabase/migrations/20261112000003_catalogo_selo_ultimas_unidades.sql` — coluna `low_stock_limit` em `catalog_settings`
- **Criar:** `src/test/loja-cartao.test.tsx` — testes de tela: cartão em retrato, prévia da Aparência e campo do selo
- **Criar:** `src/test/loja-cartao.integration.test.ts` — o que a loja pública entrega (opções, esgotada, selo) e o limite do selo nas Configurações, no banco de teste
- **Modificar:** `src/lib/catalogo/vitrine.ts` — funções puras: opções do primeiro tipo com a esgotada, resumo do segundo tipo e regra do selo
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `carregarVitrine` lê o limite do selo e devolve, por produto, as opções do cartão e se mostra "Últimas unidades!"
- **Modificar:** `src/app/loja/components/vitrine.tsx` — cartão em retrato do modelo "grade" (REF, quadradinhos, selo); "lista" e "destaque" ficam como estão
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — seção "Selo Últimas unidades · opcional" e campo `limiteSelo` em `ConfigCatalogo`
- **Modificar:** `src/app/(auth)/catalogo/configuracoes/actions.ts` — carrega, confere e grava o limite do selo
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration

Reuso: `combinacoes`, `chaveCombinacao` e `estoqueTotal` (`src/lib/catalogo/combinacoes.ts`); `Cartao`, `Foto` e `Preco` da `vitrine.tsx`; `resumoDaGrade` e `resumoDasRegras`; `exigirGestor` e o aviso `role="status"` do formulário de Configurações. A prévia da Aparência já usa a `Vitrine` com o que `carregarVitrine` devolve, então não precisa de mudança própria.

## Checklist

- [x] Migration da coluna `low_stock_limit`, aplicada no banco de teste, e tipos regenerados
- [x] Funções puras das opções do cartão e do selo em `src/lib/catalogo/vitrine.ts`
- [x] `carregarVitrine` devolve opções, resumo do segundo tipo e o selo de cada produto
- [x] Cartão em retrato no modelo "grade", com REF, quadradinhos e selo
- [x] Campo do selo nas Configurações, com a conferência no servidor
- [x] Testes da tabela Prova escritos e passando
- [x] `npx tsc --noEmit` e lint dos arquivos da issue limpos
