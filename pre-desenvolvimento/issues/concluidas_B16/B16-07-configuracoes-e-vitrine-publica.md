# B16-07: Configurações do catálogo e vitrine pública no ar

**Tipo:** Implementação
**Página:** Configurações do catálogo, Vitrine pública, Página do produto
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Configurações do catálogo", "Vitrine pública" e "Página do produto" (com a aparência padrão)
**Depende de:** B16-06 e B16-03 aprovado

## Descrição

O lojista escolhe endereço, número que recebe pedidos, pedido mínimo e mensagem de
fechamento e publica; a vitrine pública abre sem login no endereço escolhido, com
categorias, busca, página do produto, variação indisponível sem estoque, prévia do link no
WhatsApp com o nome da loja, e "Catálogo indisponível" quando despublicado. Ainda com a
aparência padrão (a personalização é a B16-08).

## Pronto quando

Em produção, depois de publicar, o link `/loja/<endereço>` abre num celular sem login e
mostra os produtos visíveis por categoria, a página do produto com variações e as
combinações sem estoque indisponíveis; despublicar troca a página por "Catálogo
indisponível no momento".

## Cenários

### Happy Path
1. Aba **Configurações** (`/catalogo/configuracoes`, Admin/Gerente): endereço, número que
   recebe os pedidos (números conectados da empresa, sem os removidos), pedido mínimo,
   mensagem de fechamento e Publicar (componente da B16-01 com dados reais).
2. O endereço é conferido no servidor ("disponível" / "em uso") e salvo único em todas as
   empresas.
3. Publicado, `/loja/<endereço>` abre **sem login**, com o nome da empresa e a aparência
   padrão (a personalização é a B16-08): categorias, busca, produtos **visíveis**, selo
   Esgotado, aviso do pedido mínimo.
4. `/loja/<endereço>/p/<produto>`: galeria, preço, variações com as combinações sem
   estoque indisponíveis.
5. Título da aba e prévia do link no WhatsApp com o nome da loja.
6. Na lista de produtos do CRM, **Ver minha loja** abre o link quando publicado.

### Edge Cases
- Carrinho e pedido são da B16-09: até lá a vitrine não mostra o carrinho nem o botão de
  adicionar (props opcionais nos componentes).
- Despublicado ou endereço inexistente: página "Catálogo indisponível no momento" (404),
  sem marca do CRM.
- Produto oculto ou de outra loja em `/p/<id>`: "Produto não encontrado" **com a marca da loja** e link de volta para a vitrine (página normal, não 404 — decidido na execução para não cair na página sem marca).
- Endereços reservados (`prototipo`, `admin`, `api`, `loja`, `catalogo`, `crm`, `www`):
  recusados.
- Trocar o endereço de uma loja publicada: confirmação (já no componente); o link antigo
  passa a dar "indisponível".
- A vitrine lê os dados com a chave de serviço **no servidor** (a cliente não tem login);
  só devolve o que é público: produtos visíveis, preço, fotos, estoque por combinação.
  Nada de dado de contato, pedido ou configuração interna.
- Número escolhido removido depois: a publicação fica, mas a loja aparece "indisponível"
  até escolher outro número (sem número não há como receber pedido).

### Cenário de Erro
- Falha ao salvar configurações: mensagem no topo; nada é perdido do formulário.

## Banco de Dados

- Tabela nova `catalog_settings` (uma linha por empresa): `workspace_id` (chave),
  `slug` (único, sem diferenciar maiúscula), `whatsapp_connection_id` (nulo,
  `on delete set null`), `min_type` (`nenhum` | `pecas` | `valor`), `min_value`,
  `closing_message`, `published`, `updated_at`
- RLS: membros leem; Admin e Gerente gravam
- Migration: `supabase/migrations/20261003000008_catalogo_configuracoes.sql`

## Arquivos

- **Criar:** `supabase/migrations/20261003000008_catalogo_configuracoes.sql`
- **Criar:** `src/app/(auth)/catalogo/configuracoes/actions.ts` — carregar, verificar endereço, salvar (com conferência de papel)
- **Criar:** `src/app/(auth)/catalogo/configuracoes/page.tsx` + `configuracoes-client.tsx`
- **Criar:** `src/lib/catalogo/loja-publica.ts` — leitura da loja publicada pelo endereço (servidor, chave de serviço, só campos públicos)
- **Criar:** `src/app/loja/[endereco]/layout.tsx` — título e prévia do link com o nome da loja
- **Criar:** `src/app/loja/[endereco]/page.tsx` + `loja-client.tsx` — vitrine
- **Criar:** `src/app/loja/[endereco]/p/[produto]/page.tsx` + `produto-client.tsx` — produto
- **Criar:** `src/app/loja/[endereco]/not-found.tsx` — "Catálogo indisponível"
- **Criar:** `src/app/loja/[endereco]/p/[produto]/produto-nao-encontrado.tsx` — "Produto não encontrado" com a marca da loja
- **Modificar:** `src/app/loja/components/vitrine.tsx` e `pagina-produto.tsx` — carrinho e adicionar opcionais
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — `TipoMinimo` vem de `pedido.ts` (um tipo só)
- **Modificar:** `src/lib/catalogo/regras.ts` — endereços reservados e regra do endereço
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` + `page.tsx` — aba Configurações e Ver minha loja
- **Apagar:** `src/app/(auth)/catalogo/prototipo/configuracoes/` e `src/app/loja/prototipo/` — protótipos que saem nesta issue
- **Criar:** `src/test/catalogo-loja-publica.integration.test.ts` — endereço único/reservado, loja publicada x despublicada, só visíveis, Atendente não salva

## Checklist

- [x] Migration aplicada
- [x] Configurações reais com endereço conferido no servidor
- [x] Vitrine pública e produto lendo do banco, sem login
- [x] "Indisponível" e "Produto não encontrado"
- [x] Título/prévia com o nome da loja; Ver minha loja
- [x] Protótipos de configurações e da vitrine removidos
- [x] Testes de integração (7/7 em `catalogo-loja-publica.integration.test.ts`)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (CRM + celular sem login) (03/10: publicar, Ver minha loja, loja 200 sem login com título e og:title da loja, sem oculto e sem marca do CRM, P indisponível, produto oculto "não encontrado", loja inexistente e despublicada 404)
- [x] Commit + push (`949cc86`); deploy Ready (03/10)
