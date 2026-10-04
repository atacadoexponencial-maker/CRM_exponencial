# B16-05: Cadastrar produtos com fotos e organizar categorias

**Tipo:** Implementação
**Página:** Produtos (`/catalogo`), Editor de produto, Menu do CRM
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Produtos", "Editor de produto" (menos variações e estoque) e "Menu do CRM"
**Depende de:** B16-01 aprovado

## Descrição

Produtos e categorias de verdade: criar, editar, excluir e ocultar produto (nome,
descrição, preço, preço "de", código, categoria, destaque) com até 8 fotos enviadas direto
ao armazenamento; criar, renomear, excluir e reordenar categorias; reordenar produtos;
busca e filtros; Atendente sem acesso.

## Pronto quando

No CRM publicado, um Admin cadastra um produto com fotos, coloca numa categoria, reordena
categorias e produtos, oculta e mostra, e tudo continua lá ao recarregar; um Atendente
não vê a lista de produtos.

## Cenários

### Happy Path
1. Menu **Catálogo** (Admin/Gerente) abre `/catalogo` com os produtos reais da empresa,
   agrupados por categoria na ordem do lojista (componentes da B16-01 com dados reais).
2. **Novo produto** (`/catalogo/produtos/nova`): nome, descrição, preço, preço "de",
   código, categoria, visível, destaque e até 8 fotos. As fotos vão **direto do navegador
   para o armazenamento** (URL de envio assinada, criada pelo servidor depois de conferir
   o papel) — não passam pela função da Vercel (limite de 4,5 MB do corpo).
3. Salvar grava no banco e volta para a lista; editar (`/catalogo/produtos/[id]`) abre
   com os dados salvos; excluir pede confirmação e apaga produto e fotos.
4. Ocultar/mostrar pelo olho grava na hora. Arrastar produto (dentro da categoria) e
   categoria grava a nova ordem.
5. Categorias: criar, renomear, excluir (produtos vão para "Sem categoria"), reordenar.

### Edge Cases
- **Variações e estoque** são da B16-06: nesta issue o editor esconde a seção de
  variações e a lista esconde estoque e o selo Esgotado (props `comEstoque`).
- Nome de categoria repetido (sem diferenciar maiúscula): erro, também no banco
  (índice único).
- Foto removida do produto ao salvar: o arquivo é apagado do armazenamento. Foto enviada
  e abandonada (fechou sem salvar) fica órfã — aceito nesta versão (limpeza futura).
- Arquivos: só JPG, PNG e WebP, até 5 MB (conferido no navegador **e** no servidor ao
  criar a URL de envio; o bucket também limita).
- Abas Aparência e Configurações: "Em breve" até a B16-07/08; Pedidos, até a B16-10.
- Atendente: menu sem Catálogo; as rotas mandam para `/perfil`; as actions recusam.
- Isolamento: tudo por `workspace_id` (RLS) — uma empresa nunca vê produto de outra.

### Cenário de Erro
- Falha ao enviar foto: a miniatura não entra e aparece o erro; o resto do formulário
  fica como estava.
- Falha ao salvar: mensagem no topo do editor; nada é perdido do formulário.
- Produto de outra empresa ou inexistente em `/catalogo/produtos/[id]`: 404.

## Banco de Dados

- Tabela nova `catalog_categories`: `id`, `workspace_id`, `name` (único por empresa sem
  diferenciar maiúscula), `position` (ordem), `created_at`
- Tabela nova `catalog_products`: `id`, `workspace_id`, `category_id` (nulo = Sem
  categoria; `on delete set null`), `name`, `description`, `price` (> 0),
  `compare_at_price` (nulo ou > price), `sku`, `visible`, `featured`, `position`,
  `photos` (jsonb, lista ordenada de caminhos no armazenamento), `created_at`,
  `updated_at`
- RLS: membros da empresa leem; Admin e Gerente criam, editam e apagam
- Bucket público `catalog-images` (5 MB, JPG/PNG/WebP/SVG — SVG é para a logo da
  B16-08), arquivos em `<workspace_id>/produtos/<uuid>.<ext>`
- Migration: `supabase/migrations/20261003000006_catalogo_produtos.sql` (só cria; pode
  ir antes do deploy)

## Arquivos

- **Criar:** `supabase/migrations/20261003000006_catalogo_produtos.sql` — tabelas, RLS, índices e bucket
- **Criar:** `src/app/(auth)/catalogo/actions.ts` — listar catálogo, carregar produto, salvar, excluir, ocultar/mostrar, reordenar produtos, CRUD e ordem de categorias, preparar envio de foto (todas conferem sessão e papel)
- **Criar:** `src/app/(auth)/catalogo/page.tsx` + `produtos-client.tsx` — lista real
- **Criar:** `src/app/(auth)/catalogo/produtos/[id]/page.tsx` + `editor-client.tsx` — editor real (`nova` cria)
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — prop `comEstoque`
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — prop `comVariacoes`; enviar fotos com progresso/erro por arquivo
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — Catálogo aponta para `/catalogo`
- **Criar:** `src/app/(auth)/catalogo/prototipo/compartilhado.tsx` — `FaixaPrototipo`, `HREFS_PROTOTIPO` e `estoqueTotal` dos protótipos que ainda ficam (aparência, configurações, pedidos)
- **Modificar:** `src/app/(auth)/catalogo/prototipo/aparencia/prototipo-aparencia-client.tsx`, `.../configuracoes/prototipo-configuracoes-client.tsx`, `.../pedidos/prototipo-pedidos-client.tsx` — importam de `compartilhado.tsx`
- **Apagar:** `src/app/(auth)/catalogo/prototipo/page.tsx`, `prototipo-produtos-client.tsx`, `produto/` — protótipos de produtos saem (como previsto na B16-01)
- **Criar:** `src/lib/catalogo/regras.ts` — limites (8 fotos, 5 MB, formatos, bucket) iguais no navegador e no servidor (constante de arquivo `"use client"` chega ao servidor como referência, não como valor)
- **Criar:** `src/test/catalogo-produtos.integration.test.ts` — isolamento entre empresas, Atendente não grava, categoria repetida, excluir categoria leva produtos para Sem categoria, ordem

## Checklist

- [x] Migration criada e aplicada (`db push`)
- [x] Actions com conferência de sessão e papel
- [x] Envio de fotos direto ao armazenamento (URL assinada)
- [x] Lista e editor reais; Atendente sem acesso
- [x] Protótipos de produtos removidos; compartilhado extraído
- [x] Testes de integração passando (8/8 em `catalogo-produtos.integration.test.ts`)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual com Playwright (criar com foto, editar, ocultar, reordenar, categoria) (03/10: fotos no armazenamento, ocultar persiste, foto removida sai do storage, excluir apaga produto e arquivos; corrigido no caminho: `router.refresh()` logo depois do `push` cancelava a navegação)
- [x] Commit + push (`ebad09b`); deploy Ready (03/10)
