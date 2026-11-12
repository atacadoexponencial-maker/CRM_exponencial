# B61-03: Subcategorias no painel, no produto e na vitrine

**Tipo:** Implementação
**Página:** Catálogo > Produtos (painel de categorias e editor de produto) e Loja pública (vitrine)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

Cada categoria passa a ter subcategorias, em um segundo nível: o lojista cria, renomeia, reordena e apaga no painel, escolhe a subcategoria no editor de produto, e a cliente filtra por ela na vitrine.

## Pronto quando

O lojista cria "Manga curta" dentro de "Blusas", põe um produto nela, abre a loja, escolhe "Blusas" e vê os chips "Todas" e "Manga curta" filtrando a lista; outra empresa não vê nem mexe nessas subcategorias e fotos.

## Critérios de aceite

- **CA-B61-15** (automática) — Categoria com subcategorias mostra os chips delas. Dado a categoria "Blusas" com as subcategorias "Manga curta" e "Manga longa", cada uma com produtos, quando a cliente escolhe "Blusas", então aparecem os chips "Todas", "Manga curta" e "Manga longa", e os produtos das duas subcategorias continuam na lista.
- **CA-B61-16** (automática) — Escolher a subcategoria filtra só por ela. Dado "Blusas" escolhida, com produtos em "Manga curta" e em "Manga longa", quando a cliente toca em "Manga curta", então só os produtos de "Manga curta" aparecem.
- **CA-B61-17** (automática) — Produto direto na categoria aparece em "Todas". Dado "Blusas" com um produto sem subcategoria e outro em "Manga curta", quando a cliente escolhe "Blusas" e deixa "Todas" marcado, então os dois produtos aparecem.
- **CA-B61-57** (automática) — O lojista cria uma subcategoria. Dado a categoria "Blusas" sem subcategorias, quando o lojista cria "Manga curta" dentro dela, então "Manga curta" aparece na lista de subcategorias de "Blusas" e fica disponível no editor de produto.
- **CA-B61-58** (automática) — Nome repetido ou vazio na mesma categoria é recusado. Dado "Blusas" com a subcategoria "Manga curta", quando o lojista tenta criar "manga curta" de novo, ou uma subcategoria sem nome, então a tela avisa "Já existe uma subcategoria com esse nome." ou "Dê um nome à subcategoria.", e nada é criado (a recusa vale também no servidor).
- **CA-B61-59** (automática) — O mesmo nome vale em categorias diferentes. Dado "Blusas" com a subcategoria "Básicas", quando o lojista cria "Básicas" dentro de "Calças", então a subcategoria é criada.
- **CA-B61-60** (automática) — Renomear e reordenar subcategorias. Dado "Blusas" com "Manga curta" e "Manga longa", nessa ordem, quando o lojista renomeia "Manga curta" para "Curta" e a arrasta para depois de "Manga longa", então a loja pública mostra os chips "Todas", "Manga longa" e "Curta", nessa ordem.
- **CA-B61-61** (automática) — Apagar a subcategoria mantém os produtos na categoria. Dado "Manga curta", de "Blusas", com 3 produtos, quando o lojista apaga "Manga curta" e confirma no aviso, que diz quantos produtos ela tem, então a subcategoria some e os 3 produtos continuam em "Blusas", sem subcategoria.
- **CA-B61-62** (automática) — Apagar a categoria apaga as subcategorias dela. Dado "Blusas" com duas subcategorias e 5 produtos, quando o lojista apaga "Blusas" e confirma, então a categoria e as duas subcategorias somem, e os 5 produtos ficam sem categoria e sem subcategoria, como já acontece hoje com a categoria.
- **CA-B61-63** (automática) — O produto escolhe uma subcategoria da própria categoria. Dado um produto em "Blusas", que tem "Manga curta" e "Manga longa", quando o lojista abre o editor do produto, então o campo "Subcategoria" oferece "Nenhuma", "Manga curta" e "Manga longa", e nenhuma subcategoria de outra categoria.
- **CA-B61-64** (automática) — Trocar a categoria do produto limpa a subcategoria. Dado um produto em "Blusas" / "Manga curta", quando o lojista troca a categoria para "Calças" e salva, então o produto fica em "Calças" sem subcategoria (o servidor recusa gravar subcategoria que não é da categoria do produto).
- **CA-B61-65** (automática) — Produto sem categoria não escolhe subcategoria. Dado um produto sem categoria, quando o lojista abre o editor dele, então o campo "Subcategoria" aparece desligado, com o texto "Escolha uma categoria primeiro".
- **CA-B61-66** (automática) — Uma empresa não vê nem mexe nas subcategorias e fotos de outra. Dado duas empresas, cada uma com categorias, subcategorias e fotos de categoria (conferido antes que os dados das duas existem), quando o lojista da primeira lista as subcategorias, ou tenta renomear, apagar ou pôr foto usando o identificador de uma categoria da segunda, então ele vê só as da própria empresa, e as tentativas na outra não mudam nada.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-01 | "Os outros pontos também" foi lido como o recorte recomendado na conversa (topo, categorias, faixa do atacado, cartão, lista contínua, página do produto, rodapé e barra), e não como frete, conta da cliente ou identificação antes do carrinho. | confirmada | Marcelle, 10/11/2026. |

## Perguntas em aberto

Nenhuma.
