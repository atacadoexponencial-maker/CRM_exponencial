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

## Cenários

### Happy Path
1. No painel de categorias de Catálogo > Produtos, o lojista abre "Subcategorias de Blusas", digita "Manga curta" e cria. A subcategoria entra na lista de "Blusas".
2. No editor de um produto de "Blusas", o campo "Subcategoria", abaixo de "Categoria", oferece "Nenhuma" e as subcategorias de "Blusas". Ele escolhe "Manga curta" e salva.
3. A cliente abre a loja e escolhe "Blusas" (pelo círculo ou pelo chip): abaixo aparecem os chips "Todas" e "Manga curta", com "Todas" marcado e todos os produtos de "Blusas" na lista. Ela toca em "Manga curta" e só os produtos dela ficam.
4. O lojista renomeia, arrasta para reordenar e apaga subcategorias no painel; a loja segue a ordem do painel.

### Edge Cases
- Subcategoria sem produto visível não aparece na loja (como já acontece com a categoria).
- Categoria sem subcategoria com produto visível: os chips de subcategoria não aparecem.
- Produto direto na categoria (sem subcategoria) aparece em "Todas".
- Trocar de categoria na vitrine, ou tocar em "Tudo", volta a subcategoria para "Todas".
- O mesmo nome de subcategoria vale em categorias diferentes.
- Apagar a subcategoria: o aviso diz quantos produtos ela tem; eles continuam na categoria, sem subcategoria.
- Apagar a categoria: as subcategorias dela são apagadas; os produtos ficam sem categoria e sem subcategoria.
- No editor, trocar a categoria do produto limpa a subcategoria escolhida. Categoria sem subcategorias: o campo oferece só "Nenhuma".
- Produto sem categoria: o campo "Subcategoria" fica desligado, com "Escolha uma categoria primeiro".
- Mudar a categoria de um produto por outro caminho (planilha, por exemplo) também limpa a subcategoria: o banco não deixa o produto com subcategoria de outra categoria.
- Voltar do produto mantém a subcategoria escolhida, junto com o resto do filtro.

### Cenário de Erro
- Nome vazio: "Dê um nome à subcategoria." Nome repetido na mesma categoria (sem diferenciar maiúsculas): "Já existe uma subcategoria com esse nome." Nome acima de 60 caracteres: "O nome passa de 60 caracteres." Nada é criado; o servidor responde e a tela mostra.
- Subcategoria ou categoria de outra empresa, ou que não existe: "Subcategoria não encontrada." / "Categoria não encontrada."; nada muda.
- Salvar produto com subcategoria que não é da categoria dele: "Subcategoria não encontrada."; nada é gravado.
- Atendente: "Só Admin e Gerente mexem no catálogo.", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-15 | automática | `src/test/loja-subcategorias.test.tsx` e `src/test/loja-subcategorias.integration.test.ts` | a loja pública entrega as subcategorias com produto visível; ao escolher "Blusas", aparecem "Todas", "Manga curta" e "Manga longa" e os produtos das duas continuam na lista |
| CA-B61-16 | automática | `src/test/loja-subcategorias.test.tsx` | tocar em "Manga curta" deixa só os produtos dela |
| CA-B61-17 | automática | `src/test/loja-subcategorias.test.tsx` | com "Todas" marcado, aparecem o produto sem subcategoria e o de "Manga curta" |
| CA-B61-57 | automática | `src/test/loja-subcategorias.integration.test.ts` e `src/test/loja-subcategorias.test.tsx` | criar "Manga curta" grava na categoria e o catálogo do painel e do editor passa a trazê-la; a tela mostra na lista de "Blusas" |
| CA-B61-58 | automática | `src/test/loja-subcategorias.integration.test.ts` e `src/test/loja-subcategorias.test.tsx` | nome repetido e nome vazio são recusados pelo servidor com os dois avisos e nada é criado; a tela mostra o aviso |
| CA-B61-59 | automática | `src/test/loja-subcategorias.integration.test.ts` | "Básicas" é criada em "Calças" mesmo existindo em "Blusas" |
| CA-B61-60 | automática | `src/test/loja-subcategorias.integration.test.ts` | depois de renomear e reordenar, a loja pública devolve "Manga longa" e "Curta", nessa ordem |
| CA-B61-61 | automática | `src/test/loja-subcategorias.integration.test.ts` e `src/test/loja-subcategorias.test.tsx` | apagar tira a subcategoria e os 3 produtos continuam em "Blusas", sem subcategoria; o aviso da tela diz que ela tem 3 produtos |
| CA-B61-62 | automática | `src/test/loja-subcategorias.integration.test.ts` | apagar "Blusas" apaga as duas subcategorias e os 5 produtos ficam sem categoria e sem subcategoria |
| CA-B61-63 | automática | `src/test/loja-subcategorias.test.tsx` | o campo "Subcategoria" oferece "Nenhuma", "Manga curta" e "Manga longa", e nenhuma de outra categoria |
| CA-B61-64 | automática | `src/test/loja-subcategorias.integration.test.ts` e `src/test/loja-subcategorias.test.tsx` | o servidor recusa subcategoria que não é da categoria do produto; salvo em "Calças", o produto fica sem subcategoria; na tela, trocar a categoria limpa a subcategoria do que é salvo |
| CA-B61-65 | automática | `src/test/loja-subcategorias.test.tsx` | sem categoria, o campo está desligado com "Escolha uma categoria primeiro" |
| CA-B61-66 | automática | `src/test/loja-subcategorias.integration.test.ts` | com dados nas duas empresas, a primeira lista só as suas, e renomear, apagar, criar ou pôr foto com identificador da segunda não muda nada lá |

## Banco de Dados

- Tabela nova: `catalog_subcategories`
  - `id` (uuid) — identificador
  - `workspace_id` (uuid) — empresa dona; RLS igual ao de `catalog_categories`
  - `category_id` (uuid) — categoria a que pertence; apagar a categoria apaga a subcategoria
  - `name` (text, 1 a 60 caracteres) — nome, único dentro da categoria sem diferenciar maiúsculas
  - `position` (int) — ordem dentro da categoria
  - `created_at` (timestamptz)
- Tabela: `catalog_products`
  - `subcategory_id` (uuid, pode ser nulo) — subcategoria do produto; apagar a subcategoria deixa nulo; o banco zera quando ela não é da categoria do produto

## Arquivos

- **Criar:** `supabase/migrations/20261112000002_catalogo_subcategorias.sql` — tabela `catalog_subcategories`, coluna `subcategory_id`, RLS e gatilhos
- **Criar:** `src/app/(auth)/catalogo/components/subcategorias-da-categoria.tsx` — lista recolhida de subcategorias de uma categoria: criar, renomear, reordenar e apagar
- **Criar:** `src/test/loja-subcategorias.test.tsx` — testes de tela: chips na vitrine, painel e campo do editor
- **Criar:** `src/test/loja-subcategorias.integration.test.ts` — ações de subcategoria, produto, loja pública e isolamento entre empresas, no banco de teste
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — ações de subcategoria; `listarCatalogo` e `carregarProduto` trazem subcategorias; `salvarProduto` confere e grava a subcategoria
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — `subcategorias` em `CategoriaCatalogo` e `subcategoriaId` em `ProdutoResumo`
- **Modificar:** `src/app/(auth)/catalogo/components/painel-categorias.tsx` — mostra as subcategorias de cada categoria
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — liga as ações de subcategoria ao painel
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — `subcategoriaId` no produto e campo "Subcategoria"
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/page.tsx` — produto novo sem subcategoria
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `carregarVitrine` devolve as subcategorias de cada categoria e a de cada produto
- **Modificar:** `src/app/loja/components/vitrine.tsx` — chips de subcategoria e filtro por ela
- **Modificar:** `src/test/loja-categorias.test.tsx` — os dados de exemplo e as ações simuladas ganham o que a B61-03 acrescenta
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration

Reuso: `exigirGestor`, `reordenar`, `categoriaDaEmpresa` e o padrão das ações de categoria (`actions.ts`); a função de banco `garantir_mesma_empresa`; o desenho de linha, arraste e aviso de apagar do `painel-categorias.tsx`; o padrão dos chips da `vitrine.tsx`.

## Checklist

- [x] Migration criada e aplicada no banco de teste (`npm run db:teste:push`)
- [x] `types.ts` regenerado do banco de teste
- [x] Ações de subcategoria, catálogo e produto com a subcategoria
- [x] Painel de categorias com as subcategorias
- [x] Campo "Subcategoria" no editor de produto
- [x] `carregarVitrine` com subcategorias e chips na vitrine
- [x] Testes da tabela Prova escritos e passando
- [x] Testes que já renderizam a loja e o catálogo rodados (`catalogo-*`, `loja-*`, `tema*`, `esc-fecha-*`)
- [x] `npx tsc --noEmit` e `npm run lint` limpos
