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
