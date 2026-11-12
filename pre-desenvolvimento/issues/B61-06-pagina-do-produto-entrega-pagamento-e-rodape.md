# B61-06: Página do produto com entrega e pagamento, rodapé e barra do WhatsApp

**Tipo:** Implementação
**Página:** Loja pública (página do produto e vitrine) e Catálogo > Configurações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

A página do produto ganha "REF" e preço em destaque, opção esgotada riscada, as formas de entrega e de pagamento que o lojista marca nas Configurações e o aviso de compra pelo WhatsApp. A vitrine ganha o rodapé e a barra presa ao pé. A série fecha com a loja antiga funcionando sem nada preenchido e com a aprovação visual da Marcelle.

## Pronto quando

O lojista marca entrega e pagamento, abre um produto e vê "REF", preço em destaque, a grade com o esgotado riscado, "Mais informações" com entrega e pagamento e o aviso junto do botão; a vitrine mostra rodapé e barra do WhatsApp; uma loja sem nada preenchido abre e faz pedido; a Marcelle aprova celular e computador.

## Critérios de aceite

- **CA-B61-40** (automática) — A página mostra "REF" e o preço em destaque. Dado um produto com o código "00001090" e preço de R$ 14,99, quando a cliente abre a página dele, então ela vê "REF: 00001090" acima do nome e "R$ 14,99" abaixo dele, em letra maior que a do nome.
- **CA-B61-41** (automática) — Opção sem estoque aparece riscada e travada. Dado um produto com tamanhos P, M e G, em que M está sem estoque, quando a cliente abre a página dele, então a linha do M aparece riscada, com "Esgotado", e não deixa pôr quantidade; P e G aceitam.
- **CA-B61-42** (automática) — As formas de entrega e de pagamento da loja aparecem. Dado uma loja com "Correios" e "Retirada no local" marcados em entrega, e "Pix" e "Cartão de crédito" em pagamento, quando a cliente abre a página de um produto, então ela vê "Formas de entrega" com Correios e Retirada no local, e "Formas de pagamento" com Pix e Cartão de crédito, e nenhuma outra opção.
- **CA-B61-43** (automática) — Sem nada marcado, o bloco não aparece. Dado uma loja sem nenhuma forma de entrega marcada e com "Pix" marcado em pagamento, quando a cliente abre a página de um produto, então "Formas de entrega" não aparece e "Formas de pagamento" mostra Pix.
- **CA-B61-44** (automática) — O aviso de compra pelo WhatsApp aparece junto do botão. Dado um produto com estoque, quando a cliente abre a página dele, então junto do botão de adicionar aparece "Compra segura · pedido finalizado no WhatsApp da loja".
- **CA-B61-45** (automática) — Comprar pela grade continua igual. Dado um produto com Tamanho e Cor, outro com grade fechada e outro sem variação, quando a cliente escolhe as quantidades e adiciona cada um, então o carrinho recebe as mesmas peças, com os mesmos preços, faixas e mínimos de antes desta mudança.
- **CA-B61-46** (manual) — A página do produto no celular fica próxima da referência. Dado um produto com fotos, código, variações e descrição, em uma loja com entrega e pagamento marcados, quando a Marcelle abre a página no celular, então ela aprova a aparência: foto, "REF", nome, preço em destaque, grade, "Mais informações" e o botão preso ao pé da tela.
- **CA-B61-47** (automática) — A barra do WhatsApp fica presa ao pé da vitrine. Dado a vitrine de uma loja, quando a cliente abre a loja, então uma barra ao pé da tela mostra "Pedido enviado e finalizado pelo WhatsApp da loja".
- **CA-B61-48** (automática) — A barra não cobre o botão de adicionar nem o carrinho. Dado a cliente na página de um produto, e depois com o carrinho aberto, quando ela olha o pé da tela, então a barra do WhatsApp não aparece nesses dois lugares, e o botão de adicionar e o de enviar o pedido ficam livres.
- **CA-B61-49** (automática) — O rodapé mostra só a entrega e o pagamento que a loja marcou. Dado uma loja com "Transportadora" marcada em entrega e nada em pagamento, quando a cliente chega ao fim da vitrine, então o rodapé mostra "Seu pedido será enviado para o WhatsApp da loja" e "Entrega: Transportadora", sem linha de pagamento e sem prometer entrega para todo o Brasil.
- **CA-B61-70** (automática) — O lojista marca as formas de entrega e de pagamento. Dado o lojista na tela de Configurações, com nada marcado, quando ele marca "Correios" e "Excursão" em entrega, "Pix" em pagamento, e salva, então ao reabrir a tela as três caixas continuam marcadas, e a página de produto da loja mostra exatamente essas três.
- **CA-B61-71** (automática) — Forma fora da lista é recusada. Dado as listas de entrega e de pagamento, quando alguém chama o salvamento com uma forma que não está na lista (ex.: "Drone"), então o servidor recusa e as formas gravadas não mudam.
- **CA-B61-72** (automática) — Loja já publicada continua funcionando sem preencher nada. Dado uma loja publicada antes desta mudança, sem Instagram, sem foto de categoria, sem subcategoria, sem limite de selo e sem entrega e pagamento marcados, quando a cliente abre a loja e um produto, então as duas páginas abrem no visual novo, sem @, sem selo, sem chips de subcategoria e sem os blocos de entrega e pagamento, e ela consegue fazer um pedido.
- **CA-B61-73** (manual) — A vitrine no celular fica próxima da referência. Dado a loja da empresa de teste com banner, logo, Instagram, categorias com foto e subcategorias, produtos com foto e variações, selo, entrega e pagamento, quando a Marcelle abre a loja no celular, ao lado da referência, então ela aprova: banner de largura total, logo redonda, nome, @, boas-vindas, compartilhar, busca, categorias em círculo, faixa do atacado, cartões em retrato e barra do WhatsApp.
- **CA-B61-74** (manual) — A vitrine no computador continua boa. Dado a mesma loja aberta no computador, quando a Marcelle olha a vitrine e um produto, então ela aprova: o topo alinhado à esquerda (logo à esquerda sobre o banner, nome, @ e boas-vindas ao lado, "Compartilhar catálogo" na ponta direita), busca, categorias e produtos na coluna de largura máxima de hoje, com até 4 colunas de produtos, e a página do produto em duas colunas, sem nada esticado ou cortado.
- **CA-B61-75** (manual) — As cores e a fonte do lojista valem no visual novo. Dado uma loja com cor principal escura e fundo claro, e outra com fundo escuro, quando a Marcelle abre as duas, então topo, círculos, faixa, cartões, selo, quadradinhos, rodapé e barra do WhatsApp usam as cores e a fonte de cada loja, e todo texto fica legível.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-05 | A lista pronta é: entrega com Correios, Transportadora, Retirada no local e Excursão; pagamento com Pix, Cartão de crédito, Boleto e Dinheiro. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-06 | O rodapé não promete "Entrega para todo o Brasil" nem "Compra 100% segura" para toda loja: mostra só o que o lojista marcou, mais os textos sobre o WhatsApp. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-07 | Os textos fixos da barra e do rodapé são iguais para todas as lojas; o lojista não edita. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-11 | A referência foi vista só no celular. No computador, o visual novo é o mesmo desenho, centralizado e com mais colunas, sem um modelo próprio. | invalidada | No computador o topo não é centralizado: fica alinhado à esquerda (ver a pergunta PER-B61-06). Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-03 | De onde vêm as formas de entrega e de pagamento? | respondida | De uma lista pronta que o lojista marca; só aparece o que ele marcar. Marcelle, 10/11/2026. |
| PER-B61-06 | No computador, como ficam o topo e o conteúdo? | respondida | Topo alinhado à esquerda: logo redonda à esquerda sobre o banner, nome, @ e boas-vindas ao lado dela, "Compartilhar catálogo" na ponta direita. Busca, categorias e produtos continuam na coluna de largura máxima de hoje, com até 4 colunas de produtos. No celular o topo é centralizado. Marcelle, 10/11/2026. |

## Cenários

### Happy Path
1. O lojista abre Catálogo > Configurações, marca "Correios" e "Excursão" em entrega e "Pix" em pagamento, e salva; ao reabrir, as três continuam marcadas.
2. A cliente abre um produto: vê "REF: código" acima do nome, o preço em letra maior que a do nome, a grade com a opção sem estoque riscada e com "Esgotado", "Mais informações" com a descrição, "Formas de entrega" e "Formas de pagamento", e, junto do botão de adicionar, "Compra segura · pedido finalizado no WhatsApp da loja".
3. Ela escolhe as quantidades e adiciona: o carrinho recebe as mesmas peças e valores de antes.
4. Na vitrine, o fim da página traz o rodapé ("Seu pedido será enviado para o WhatsApp da loja", "Entrega: …", "Pagamento: …", "Catálogo digital · Compra assistida pelo WhatsApp da loja") e uma barra presa ao pé com "Pedido enviado e finalizado pelo WhatsApp da loja".

### Edge Cases
- Nada marcado em entrega (ou em pagamento): o bloco da página do produto e a linha do rodapé correspondentes não aparecem.
- Produto sem código: sem a linha "REF". Produto sem descrição e loja sem formas marcadas: sem "Mais informações".
- Carrinho aberto e página do produto: a barra do WhatsApp não aparece.
- Loja publicada antes da série, sem nada preenchido: vitrine e produto abrem no visual novo, sem @, selo, chips de subcategoria e blocos de entrega e pagamento, e o pedido é feito.

### Cenário de Erro
- Forma fora da lista (ex.: "Drone"): o servidor recusa com "Forma de entrega inválida." ou "Forma de pagamento inválida." e nada é gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-40 | automática | `src/test/loja-produto.test.tsx` | a página mostra "REF: 00001090" antes do nome e "R$ 14,99" depois dele, com letra maior que a do nome |
| CA-B61-41 | automática | `src/test/loja-produto.test.tsx` | a linha do M está riscada, com "Esgotado" e o campo travado; P e G aceitam quantidade |
| CA-B61-42 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` e `src/test/loja-produto.test.tsx` | a loja pública entrega Correios e Retirada no local, Pix e Cartão de crédito, e só eles; a página mostra os dois blocos com exatamente essas opções |
| CA-B61-43 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` e `src/test/loja-produto.test.tsx` | sem entrega marcada e com Pix, a loja pública entrega entrega vazia e Pix; a página não mostra "Formas de entrega" e mostra "Formas de pagamento" com Pix |
| CA-B61-44 | automática | `src/test/loja-produto.test.tsx` | "Compra segura · pedido finalizado no WhatsApp da loja" aparece no mesmo bloco do botão de adicionar |
| CA-B61-45 | automática | `src/test/loja-produto.test.tsx` | produto com Tamanho e Cor, com grade fechada e sem variação mandam ao carrinho as peças escolhidas, com o valor pela faixa no botão e o aviso do mínimo, como antes |
| CA-B61-46 | manual | roteiro abaixo | a Marcelle aprova a página do produto no celular |
| CA-B61-47 | automática | `src/test/loja-produto.test.tsx` | a vitrine tem a barra presa ao pé com "Pedido enviado e finalizado pelo WhatsApp da loja" |
| CA-B61-48 | automática | `src/test/loja-produto.test.tsx` | na página do produto não há a barra e o botão de adicionar está lá; na loja, ao abrir o carrinho, a barra some e o botão de fazer o pedido está lá |
| CA-B61-49 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` e `src/test/loja-produto.test.tsx` | com Transportadora e nada em pagamento, a loja pública entrega só isso; o rodapé mostra o texto do WhatsApp e "Entrega: Transportadora", sem linha de pagamento nem "todo o Brasil" |
| CA-B61-70 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` e `src/test/loja-produto.test.tsx` | salvar Correios, Excursão e Pix grava, a tela reabre com as três e a loja pública entrega exatamente as três; na tela, marcar as caixas manda as três ao salvar |
| CA-B61-71 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` | "Drone" em entrega ou em pagamento é recusado pelo servidor e as formas gravadas não mudam |
| CA-B61-72 | automática | `src/test/loja-entrega-pagamento.integration.test.ts` e `src/test/loja-produto.test.tsx` | loja só com endereço e número abre vitrine e produto sem Instagram, selo, subcategoria e formas, e o pedido é registrado; as telas abrem sem @, selo, chips de subcategoria e blocos de entrega e pagamento |
| CA-B61-73 | manual | roteiro abaixo | a Marcelle aprova a vitrine no celular, ao lado da referência |
| CA-B61-74 | manual | roteiro abaixo | a Marcelle aprova a vitrine e o produto no computador |
| CA-B61-75 | manual | roteiro abaixo | a Marcelle confere cores e fonte em uma loja clara e em uma escura |

### Roteiro manual — CA-B61-46
1. No celular, abra no preview da Vercel a loja `/loja/teste-b11`, com entrega e pagamento marcados em Catálogo > Configurações.
2. Abra um produto com fotos, código, variações e descrição.
3. Confira: foto, "REF", nome, preço em destaque, grade, "Mais informações" e o botão preso ao pé da tela.

### Roteiro manual — CA-B61-73
1. Na empresa de teste, deixe a loja com banner, logo, Instagram, categorias com foto e subcategorias, produtos com foto e variações, selo, entrega e pagamento.
2. No celular, abra `/loja/teste-b11` ao lado de `https://catalogofast.com.br/shallonmodaatacado`.
3. Confira: banner de largura total, logo redonda, nome, @, boas-vindas, compartilhar, busca, categorias em círculo, faixa do atacado, cartões em retrato e barra do WhatsApp.

### Roteiro manual — CA-B61-74
1. No computador, abra a mesma loja e um produto.
2. Confira: topo alinhado à esquerda (logo à esquerda sobre o banner, nome, @ e boas-vindas ao lado, "Compartilhar catálogo" na ponta direita); busca, categorias e produtos na coluna de largura máxima, com até 4 colunas; página do produto em duas colunas, sem nada esticado ou cortado.

### Roteiro manual — CA-B61-75
1. Em Catálogo > Aparência, ponha cor principal escura e fundo claro; abra a loja e um produto.
2. Troque para um fundo escuro; abra de novo.
3. Confira nos dois casos: topo, círculos, faixa, cartões, selo, quadradinhos, rodapé e barra do WhatsApp usam as cores e a fonte da loja, e todo texto fica legível.

## Banco de Dados

- Tabela: `catalog_settings`
  - `delivery_methods` (text[], padrão vazio) — formas de entrega marcadas, pelos identificadores da lista pronta
  - `payment_methods` (text[], padrão vazio) — formas de pagamento marcadas, pelos identificadores da lista pronta

## Arquivos

- **Criar:** `supabase/migrations/20261112000004_catalogo_entrega_e_pagamento.sql` — colunas `delivery_methods` e `payment_methods`
- **Criar:** `src/lib/catalogo/entrega-e-pagamento.ts` — a lista pronta de formas de entrega e de pagamento, a conferência e os nomes para exibir
- **Criar:** `src/test/loja-produto.test.tsx` — testes de tela: página do produto, barra, rodapé, caixas das Configurações e loja sem nada preenchido
- **Criar:** `src/test/loja-entrega-pagamento.integration.test.ts` — salvar e recusar formas, o que a loja pública entrega e a loja antiga fazendo pedido, no banco de teste
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — seções "Formas de entrega · opcional" e "Formas de pagamento · opcional"
- **Modificar:** `src/app/(auth)/catalogo/configuracoes/actions.ts` — carrega, confere e grava as formas
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — `carregarLojaPublica` devolve as formas de entrega e de pagamento, pelos nomes
- **Modificar:** `src/app/loja/components/pagina-produto.tsx` — "REF" acima do nome, preço em destaque, "Mais informações" e aviso de compra junto do botão
- **Modificar:** `src/app/loja/components/grade-quantidades.tsx` — a linha sem estoque diz "Esgotado"
- **Modificar:** `src/app/loja/components/vitrine.tsx` — rodapé e barra do WhatsApp presa ao pé
- **Modificar:** `src/app/loja/[endereco]/page.tsx` — passa as formas da loja à vitrine
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx` — repassa as formas e esconde a barra com o carrinho aberto
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — informa se o carrinho está aberto
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/page.tsx` — passa as formas da loja à página do produto
- **Modificar:** `src/app/loja/[endereco]/p/[produto]/produto-client.tsx` — repassa as formas
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration

Reuso: `exigirGestor` e o padrão de `salvarConfiguracoes`; `CabecalhoLoja`, `coresDaVitrine` e `GradeQuantidades`; o padrão de teste com `useCarrinhoLoja` de `src/test/loja-repetir-pedido-com-nome.test.tsx`; `fazerPedido` com a conferência de teste, como em `src/test/loja-limites-que-valem.integration.test.ts`.

## Checklist

- [x] Migration das formas de entrega e de pagamento, aplicada no banco de teste, e tipos regenerados
- [x] Lista pronta e conferência das formas em `src/lib/catalogo/entrega-e-pagamento.ts`
- [x] Configurações: caixas de entrega e de pagamento, com a conferência no servidor
- [x] Loja pública entrega as formas marcadas
- [x] Página do produto: REF, preço em destaque, "Esgotado" na linha, "Mais informações" e aviso de compra
- [x] Vitrine: rodapé e barra do WhatsApp, que some com o carrinho aberto
- [x] Testes da tabela Prova escritos e passando
- [x] `npx tsc --noEmit` e lint dos arquivos da issue limpos
