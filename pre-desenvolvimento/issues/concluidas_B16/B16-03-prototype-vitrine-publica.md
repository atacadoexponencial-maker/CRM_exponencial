# B16-03: Protótipo — Vitrine pública, produto e carrinho

**Tipo:** Protótipo
**Página:** Vitrine pública (`/loja/[endereço]`), Página do produto, Carrinho e pedido
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Vitrine pública", "Página do produto" e "Carrinho e pedido"

## Descrição

A loja vista pela cliente final, com uma loja de exemplo e sem gravar pedido: vitrine nos
três layouts, categorias e busca, página do produto com variação indisponível, carrinho
com a barra do pedido mínimo, nome e WhatsApp, e a mensagem de pedido que abriria no
WhatsApp.

## Pronto quando

A Marcelle abre o link de exemplo no celular, monta um carrinho, vê o mínimo bloquear e
liberar o botão, e vê o texto da mensagem do pedido — sem nenhuma marca do CRM na tela.

## Cenários

### Happy Path
1. `/loja/prototipo` abre **sem login**, fora do layout do CRM, com a loja de exemplo
   (Bela Ateliê) e o título da aba com o nome da loja. Nenhuma marca do CRM na tela.
2. Faixa do protótipo com os três layouts (Grade, Lista, Destaque) para alternar.
3. Vitrine (componente da B16-02): categorias, busca, produtos visíveis, selo Esgotado.
4. Tocar num produto abre `/loja/prototipo/p/[id]`: galeria (deslizar no celular,
   miniaturas no computador, ampliar ao tocar), nome, preço/preço "de", descrição,
   escolha de variação (combinação sem estoque aparece riscada e não pode ser escolhida),
   quantidade limitada ao estoque, **Adicionar ao carrinho** com confirmação.
5. Carrinho (gaveta lateral, aberto pelo ícone): itens com foto, variação, quantidade
   alterável (até o estoque), remover, total de peças e valor, barra do pedido mínimo
   ("Faltam 4 peças"), nome e WhatsApp, **Fazer pedido** desabilitado até atingir o mínimo.
6. Fazer pedido no protótipo: valida nome e WhatsApp e mostra a confirmação com o número
   do pedido de exemplo e **o texto exato da mensagem** que abriria no WhatsApp, com o
   botão "Abrir no WhatsApp" (link `wa.me` para o número de exemplo) — nada é gravado.
7. O carrinho fica guardado no aparelho (fechar e reabrir mantém os itens) e esvazia
   depois do pedido.

### Edge Cases
- WhatsApp inválido (menos de 10 dígitos com DDD): erro no campo. O número é guardado
  só com dígitos e com o 55 na frente quando vier sem.
- Item que já está no carrinho com a mesma combinação: soma a quantidade, sem passar do
  estoque.
- Produto sem variação: só quantidade.
- Armazenamento do aparelho bloqueado (aba anônima): o carrinho funciona na sessão, sem
  quebrar.
- Mensagem do pedido: número do pedido, itens (nome, variação, quantidade, preço e
  subtotal), total de peças e valor, nome da cliente e a mensagem de fechamento da loja.

### Cenário de Erro
- Produto inexistente no endereço `/p/[id]`: página "Produto não encontrado" com volta
  para a loja.

## Arquivos

- **Modificar:** `src/middleware.ts` — `/loja` nas rotas públicas (a vitrine abre sem login)
- **Criar:** `src/lib/catalogo/combinacoes.ts` — funções puras de variação/combinação/estoque, fora do arquivo de tela para o servidor poder usar (a página da loja roda no servidor)
- **Modificar:** `src/app/(auth)/catalogo/components/variacoes-estoque.tsx` — passa a reexportar as funções do `src/lib/catalogo/combinacoes.ts`
- **Modificar:** `src/app/(auth)/catalogo/prototipo/prototipo-produtos-client.tsx` — `estoqueTotal` usa o lib
- **Criar:** `src/app/loja/components/pedido.ts` — funções puras do pedido: totais, quanto falta para o mínimo, WhatsApp normalizado e texto da mensagem (o servidor reaproveita na B16-09)
- **Modificar:** `src/app/loja/components/vitrine.tsx` — cabeçalho da loja (logo/nome e carrinho) vira componente exportado, usado também na página do produto
- **Criar:** `src/app/loja/components/pagina-produto.tsx` — página do produto apresentacional
- **Criar:** `src/app/loja/components/carrinho.tsx` — gaveta do carrinho apresentacional (itens, totais, mínimo, dados da cliente, fazer pedido)
- **Criar:** `src/app/loja/components/carrinho-local.ts` — carrinho guardado no aparelho (localStorage com fallback em memória)
- **Criar:** `src/app/loja/prototipo/dados-exemplo.ts` — loja de exemplo para a vitrine (a partir dos dados da B16-01/02)
- **Criar:** `src/app/loja/prototipo/usar-carrinho-prototipo.tsx` — carrinho e gaveta compartilhados pela vitrine e pelo produto do protótipo, com a faixa de layouts
- **Criar:** `src/app/loja/prototipo/layout.tsx` — título da aba com o nome da loja
- **Criar:** `src/app/loja/prototipo/page.tsx` + `prototipo-loja-client.tsx` — vitrine do protótipo (sai na B16-07)
- **Criar:** `src/app/loja/prototipo/p/[id]/page.tsx` + `prototipo-produto-client.tsx` — produto do protótipo (sai na B16-07)

## Checklist

- [x] `/loja` público no middleware
- [x] `pedido.ts` com totais, mínimo, WhatsApp e mensagem
- [x] Página do produto com galeria, variação indisponível e quantidade limitada
- [x] Carrinho com mínimo, dados da cliente e confirmação com a mensagem
- [x] Carrinho guardado no aparelho
- [x] Os 3 layouts alternáveis no protótipo
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: Playwright em tela de celular, sem login (03/10: 20 verificações — título da loja, sem marca do CRM, variação indisponível, limite de estoque, carrinho persistente, mínimo, WhatsApp inválido, mensagem e link, carrinho esvazia, produto inexistente)
- [x] Commit + push (`0238b3c`); deploy Ready (03/10)
