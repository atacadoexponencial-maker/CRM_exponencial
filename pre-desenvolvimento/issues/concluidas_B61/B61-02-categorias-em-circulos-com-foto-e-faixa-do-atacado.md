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

## Cenários

### Happy Path
1. O lojista abre Catálogo > Produtos. No painel de categorias, cada categoria tem uma miniatura redonda (a foto ou a inicial do nome). Ele toca em "Enviar foto de Blusas", escolhe um JPG e a miniatura passa a mostrar a imagem.
2. A cliente abre `/loja/<endereço>`: abaixo da busca, uma fileira de círculos que rola para o lado, um por categoria com produto visível, com o nome embaixo; depois os chips de sempre ("Tudo" e as categorias); depois a faixa "Atacado · Mínimo 10 peças".
3. Ela toca no círculo "Blusas": só os produtos de "Blusas" aparecem, e o círculo e o chip "Blusas" ficam marcados. Tocar em "Tudo" tira o filtro.
4. O lojista toca em "Trocar foto de Blusas" e envia outra imagem: a loja passa a mostrar a nova e o arquivo antigo é apagado. Toca em "Remover foto de Blusas": o círculo volta a usar a foto do primeiro produto visível da categoria.

### Edge Cases
- Categoria sem foto enviada: o círculo usa a foto do primeiro produto visível dela, na ordem do lojista (o primeiro que tiver foto).
- Categoria sem foto enviada e com produtos sem foto: o círculo mostra a inicial do nome, em maiúscula.
- Categoria com todos os produtos ocultos: não aparece nos círculos nem nos chips (como já era nos chips).
- Loja sem nenhuma categoria com produto: nem círculos nem chips.
- Loja com mínimo em reais: "Atacado · Mínimo R$ 300,00". Com desconto por pedido, a faixa traz também o aviso do desconto, com o texto de hoje ("10% a menos a partir de 50 peças").
- Loja só com desconto, sem mínimo: a faixa mostra "Atacado" e o aviso do desconto.
- Loja sem mínimo e sem desconto: a faixa não aparece.
- Excluir a categoria apaga também o arquivo da foto.
- Voltar do produto mantém a categoria escolhida, como hoje.

### Cenário de Erro
- Arquivo que não é PNG, JPG ou WebP (ex.: PDF): "Use PNG, JPG ou WebP.", o mesmo aviso da logo; nada é enviado e a foto não muda.
- Imagem acima de 2 MB (limite da logo): "A imagem passa de 2 MB."; a foto não muda.
- Caminho de foto que não é da pasta da empresa, chamando o salvamento direto: "Imagem inválida. Envie de novo."; a foto não muda.
- Categoria de outra empresa ou que não existe: "Categoria não encontrada."
- Falha no envio ao armazenamento: "O envio falhou. Tente de novo."
- Atendente: "Só Admin e Gerente mexem no catálogo.", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-11 | automática | `src/test/loja-categorias-foto.integration.test.ts` e `src/test/loja-categorias.test.tsx` | a loja pública entrega para "Blusas" a foto enviada e para "Calças" a foto do primeiro produto visível; a vitrine desenha um círculo por categoria com essa foto e o nome |
| CA-B61-12 | automática | `src/test/loja-categorias-foto.integration.test.ts` e `src/test/loja-categorias.test.tsx` | categoria sem foto e com produtos sem foto chega sem foto, e o círculo mostra "A" |
| CA-B61-13 | automática | `src/test/loja-categorias-foto.integration.test.ts` e `src/test/loja-categorias.test.tsx` | "Inverno" existe no banco, com produtos todos ocultos, e não vem na loja pública; a vitrine só desenha círculo e chip das categorias recebidas |
| CA-B61-14 | automática | `src/test/loja-categorias.test.tsx` | tocar no círculo "Blusas" deixa só os produtos dela, e o círculo e o chip "Blusas" ficam marcados |
| CA-B61-18 | automática | `src/test/loja-categorias.test.tsx` | com mínimo de 10 peças, a faixa antes dos produtos diz "Atacado · Mínimo 10 peças" |
| CA-B61-19 | automática | `src/test/loja-categorias.test.tsx` | com mínimo de R$ 300,00 e desconto de 10% a partir de 50 peças, a faixa diz "Atacado · Mínimo R$ 300,00" e "10% a menos a partir de 50 peças" |
| CA-B61-20 | automática | `src/test/loja-categorias.test.tsx` | sem mínimo e sem desconto, a faixa não é desenhada |
| CA-B61-54 | automática | `src/test/loja-categorias-foto.integration.test.ts` e `src/test/loja-categorias.test.tsx` | enviar um JPG de 1 MB grava a foto, o catálogo do painel e a loja pública passam a devolver a imagem; no painel a miniatura mostra a imagem |
| CA-B61-55 | automática | `src/test/loja-categorias-foto.integration.test.ts` e `src/test/loja-categorias.test.tsx` | PDF e imagem acima de 2 MB são recusados pelo servidor com os avisos da logo, e a foto gravada não muda; a tela mostra o aviso |
| CA-B61-56 | automática | `src/test/loja-categorias-foto.integration.test.ts` | depois da troca a loja devolve a imagem nova; depois de remover, devolve a foto do primeiro produto da categoria |

## Banco de Dados

- Tabela: `catalog_categories`
  - `photo_path` (text, pode ser nulo) — caminho da foto da categoria no armazenamento `catalog-images`, na pasta `<empresa>/marca/`

## Arquivos

- **Criar:** `supabase/migrations/20261112000001_catalogo_foto_da_categoria.sql` — coluna `photo_path` em `catalog_categories`
- **Criar:** `src/test/loja-categorias.test.tsx` — testes de tela: círculos, filtro, faixa do atacado e foto no painel de categorias
- **Criar:** `src/test/loja-categorias-foto.integration.test.ts` — enviar, recusar, trocar e remover a foto, e o que a loja pública devolve, no banco de teste
- **Modificar:** `src/app/(auth)/catalogo/actions.ts` — `prepararEnvioFotoCategoria`, `salvarFotoCategoria`; `listarCatalogo` devolve a foto; excluir a categoria apaga o arquivo
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — `fotoUrl` em `CategoriaCatalogo`
- **Modificar:** `src/app/(auth)/catalogo/components/painel-categorias.tsx` — miniatura redonda com enviar, trocar e remover
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — envia a foto ao armazenamento com a URL assinada e chama as ações novas
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `carregarVitrine` devolve a foto de cada categoria (a enviada ou a do primeiro produto visível)
- **Modificar:** `src/app/loja/components/vitrine.tsx` — `fotoUrl` em `CategoriaVitrine`, círculos de categoria, chips marcados e faixa do atacado no lugar do aviso de mínimo
- **Modificar:** `src/app/loja/components/pedido.ts` — `minimoDaFaixa`, o texto do mínimo para a faixa
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx` — entrega o mínimo no texto da faixa
- **Modificar:** `src/app/(auth)/catalogo/aparencia/page.tsx` — a prévia recebe o mínimo no texto da faixa
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration

Reuso: `FORMATOS_LOGO`, `TAMANHO_MAX_LOGO`, `caminhoDaEmpresa` e `BUCKET_CATALOGO` (`regras.ts`), o padrão de envio com URL assinada de `prepararEnvioImagemLoja` e `aparencia-client.tsx`, `urlPublicaImagem`, `exigirGestor`, `coresDaVitrine` e o padrão do círculo de `LogoRedonda`.

## Checklist

- [x] Migration criada e aplicada no banco de teste (`npm run db:teste:push`)
- [x] `types.ts` regenerado do banco de teste
- [x] Ações da foto da categoria e `listarCatalogo` com a foto
- [x] Painel de categorias com miniatura, enviar, trocar e remover
- [x] `carregarVitrine` com a foto de cada categoria
- [x] Círculos de categoria, chips marcados e faixa do atacado na vitrine
- [x] Testes da tabela Prova escritos e passando
- [x] Testes que já renderizam a loja e o catálogo rodados (`catalogo-*`, `loja-*`, `tema*`, `esc-fecha-*`)
- [x] `npx tsc --noEmit` e `npm run lint` limpos
