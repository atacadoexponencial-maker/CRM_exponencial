# Spec: Nova vitrine da loja

> série: B61
> estado: aprovada em 10/11/2026

## Visão Geral

A loja pública do catálogo (`/loja/<endereço>`) ganha uma aparência mais próxima da que
os atacadistas de moda já conhecem de outras plataformas de catálogo. A referência é a
loja de um cliente em outra plataforma, `https://catalogofast.com.br/shallonmodaatacado`,
vista em 10/11/2026 no tamanho de celular.

É para duas pessoas:

- **A cliente da loja** (revendedora), que abre o link no celular: reconhece a loja pelo
  topo com logo e nome, acha a categoria pela foto, vê no cartão o código da peça e os
  tamanhos que ainda têm estoque, e sabe na página do produto como recebe e como paga.
- **O lojista**, que ganha no painel do catálogo o que alimenta essa aparência: Instagram
  da loja, foto e subcategorias nas categorias, limite do selo "Últimas unidades!" e as
  formas de entrega e de pagamento.

O que a loja já faz continua como está: banner de largura total, grade de quantidades,
grade fechada, faixas de preço, desconto por pedido, pedido mínimo, repetir pedido,
ordenação, "Só com estoque", cores e fonte do lojista, preço com vírgula e o envio do
pedido pelo WhatsApp.

## Páginas / Módulos

### Vitrine da loja: topo

**Descrição:** o começo da página da loja deixa de ser uma barra com a logo à esquerda e
passa a ser um topo de perfil, sobre o banner que já existe.

**Componentes:**
- Banner: a imagem de capa do lojista, de uma borda à outra da tela, como hoje.
- Logo redonda: a logo do lojista dentro de um círculo, metade sobre o banner quando há
  banner. No celular fica centralizada; no computador, à esquerda.
- Nome da loja: no celular, abaixo da logo e centralizado; no computador, ao lado da logo.
- Instagram: o @ da loja, abaixo do nome, quando o lojista preencheu.
- Texto de boas-vindas: abaixo do Instagram, com no máximo duas linhas.
- Botão "Compartilhar catálogo": no celular, abaixo das boas-vindas; no computador, na
  ponta direita do topo, na altura do nome.
- Barra da loja: a barra presa ao alto da tela, com a logo pequena, o nome, "Repetir
  pedido" (quando há pedido anterior no aparelho) e o carrinho.

**Comportamentos:**
- Ver o topo: a cliente abre a loja e vê banner, logo redonda, nome, Instagram e
  boas-vindas, nessa ordem.
- Abrir o Instagram: tocar no @ abre o perfil da loja no Instagram em outra aba.
- Ler o texto de boas-vindas inteiro: tocar em "ver mais" mostra o texto completo quando
  ele passa de duas linhas.
- Compartilhar o catálogo: tocar no botão abre o compartilhamento do aparelho com o link
  da loja; onde o aparelho não tem compartilhamento, o link é copiado.
- Rolar a página: a barra da loja continua presa ao alto, com carrinho e "Repetir pedido".

**Critérios de aceite:**

#### CA-B61-01 — O topo mostra a logo redonda com nome, Instagram e boas-vindas · prova: automática

- **Dado** uma loja com logo, nome, Instagram "@lojateste" e texto de boas-vindas
- **Quando** a cliente abre a loja
- **Então** ela vê a logo dentro de um círculo e, abaixo dela, o nome da loja, "@lojateste" e o texto de boas-vindas

#### CA-B61-02 — Loja sem logo mostra a inicial do nome no círculo · prova: automática

- **Dado** uma loja sem logo, com o nome "Bela Moda"
- **Quando** a cliente abre a loja
- **Então** o círculo mostra a letra "B" e o nome "Bela Moda" aparece abaixo dele

#### CA-B61-03 — Loja sem Instagram não mostra o @ · prova: automática

- **Dado** uma loja sem Instagram preenchido
- **Quando** a cliente abre a loja
- **Então** nenhum @ aparece no topo e nenhum espaço vazio fica no lugar dele

#### CA-B61-04 — O @ abre o Instagram da loja · prova: automática

- **Dado** uma loja com Instagram "@lojateste"
- **Quando** a cliente toca no @
- **Então** abre em outra aba o endereço `https://instagram.com/lojateste`

#### CA-B61-05 — O banner continua de uma borda à outra, com a logo sobre ele · prova: manual

- **Dado** uma loja com banner e logo, aberta no celular e no computador
- **Quando** a Marcelle olha o topo
- **Então** o banner ocupa toda a largura da tela e a logo redonda fica metade sobre ele: centralizada no celular, à esquerda no computador

#### CA-B61-06 — Loja sem banner mostra o topo sem buraco · prova: automática

- **Dado** uma loja sem banner
- **Quando** a cliente abre a loja
- **Então** a logo redonda, o nome e o botão de compartilhar aparecem logo abaixo da barra da loja, e nenhuma imagem de capa é desenhada

#### CA-B61-07 — "Compartilhar catálogo" entrega o link da loja · prova: automática

- **Dado** a loja aberta em um aparelho com compartilhamento
- **Quando** a cliente toca em "Compartilhar catálogo"
- **Então** o compartilhamento do aparelho abre com o nome da loja e o link da vitrine (não o de um produto)

#### CA-B61-08 — Sem compartilhamento no aparelho, o link é copiado · prova: automática

- **Dado** a loja aberta em um navegador sem compartilhamento
- **Quando** a cliente toca em "Compartilhar catálogo"
- **Então** o link da vitrine vai para a área de transferência e o botão mostra "Link copiado" por 2 segundos

#### CA-B61-09 — Texto de boas-vindas longo abre com "ver mais" · prova: automática

- **Dado** uma loja com texto de boas-vindas de 300 caracteres
- **Quando** a cliente toca em "ver mais"
- **Então** o texto inteiro aparece e o botão passa a dizer "ver menos"

#### CA-B61-10 — A barra da loja continua com carrinho e "Repetir pedido" · prova: automática

- **Dado** uma loja com 3 peças no carrinho e um pedido anterior guardado no aparelho
- **Quando** a cliente abre a loja
- **Então** a barra do alto mostra o carrinho com o número 3 e o botão "Repetir pedido", e os dois funcionam como antes

### Vitrine da loja: categorias

**Descrição:** além dos chips de texto, as categorias aparecem em círculos com foto, no
estilo dos stories, e podem ter subcategorias.

**Componentes:**
- Chips de categoria: "Tudo" e uma por categoria, na ordem do lojista, como hoje.
- Círculos de categoria: uma fileira que rola para o lado, um círculo com foto e o nome
  embaixo para cada categoria que tem produto visível.
- Chips de subcategoria: aparecem abaixo quando a categoria escolhida tem subcategorias.
- Faixa do atacado: uma faixa em destaque com "Atacado" e o pedido mínimo da loja.

**Comportamentos:**
- Escolher uma categoria pelo círculo: tocar no círculo filtra os produtos por ela.
- Escolher uma categoria pelo chip: tocar no chip filtra os produtos por ela, como hoje.
- Ver as subcategorias: ao escolher uma categoria com subcategorias, os chips delas
  aparecem, com "Todas" na frente.
- Escolher uma subcategoria: tocar no chip filtra os produtos por ela.
- Voltar para tudo: tocar em "Tudo" tira o filtro de categoria e de subcategoria.
- Ver o pedido mínimo: a faixa do atacado mostra o mínimo da loja antes dos produtos.

**Critérios de aceite:**

#### CA-B61-11 — Cada categoria com produto aparece em um círculo com foto · prova: automática

- **Dado** uma loja com as categorias "Blusas" (foto enviada pelo lojista) e "Calças" (sem foto enviada, com produtos com foto)
- **Quando** a cliente abre a loja
- **Então** ela vê um círculo "Blusas" com a foto enviada e um círculo "Calças" com a foto do primeiro produto visível da categoria

#### CA-B61-12 — Categoria sem nenhuma foto mostra a inicial no círculo · prova: automática

- **Dado** uma categoria "Acessórios" sem foto enviada e com produtos sem foto
- **Quando** a cliente abre a loja
- **Então** o círculo "Acessórios" mostra a letra "A"

#### CA-B61-13 — Categoria sem produto visível não aparece · prova: automática

- **Dado** uma categoria "Inverno" cujos produtos estão todos ocultos
- **Quando** a cliente abre a loja
- **Então** "Inverno" não aparece nem nos círculos nem nos chips

#### CA-B61-14 — Tocar no círculo filtra pela categoria · prova: automática

- **Dado** uma loja com produtos em "Blusas" e em "Calças"
- **Quando** a cliente toca no círculo "Blusas"
- **Então** só os produtos de "Blusas" aparecem, e o círculo e o chip "Blusas" ficam marcados

#### CA-B61-15 — Categoria com subcategorias mostra os chips delas · prova: automática

- **Dado** a categoria "Blusas" com as subcategorias "Manga curta" e "Manga longa", cada uma com produtos
- **Quando** a cliente escolhe "Blusas"
- **Então** aparecem os chips "Todas", "Manga curta" e "Manga longa", e os produtos das duas subcategorias continuam na lista

#### CA-B61-16 — Escolher a subcategoria filtra só por ela · prova: automática

- **Dado** "Blusas" escolhida, com produtos em "Manga curta" e em "Manga longa"
- **Quando** a cliente toca em "Manga curta"
- **Então** só os produtos de "Manga curta" aparecem

#### CA-B61-17 — Produto direto na categoria aparece em "Todas" · prova: automática

- **Dado** "Blusas" com um produto sem subcategoria e outro em "Manga curta"
- **Quando** a cliente escolhe "Blusas" e deixa "Todas" marcado
- **Então** os dois produtos aparecem

#### CA-B61-18 — A faixa do atacado mostra o pedido mínimo da loja · prova: automática

- **Dado** uma loja com pedido mínimo de 10 peças
- **Quando** a cliente abre a loja
- **Então** uma faixa antes dos produtos mostra "Atacado · Mínimo 10 peças"

#### CA-B61-19 — Mínimo em reais e desconto por pedido também entram na faixa · prova: automática

- **Dado** uma loja com pedido mínimo de R$ 300,00 e desconto de 10% a partir de 50 peças
- **Quando** a cliente abre a loja
- **Então** a faixa mostra "Atacado · Mínimo R$ 300,00" e o aviso do desconto, com o mesmo texto de hoje

#### CA-B61-20 — Loja sem mínimo e sem desconto não mostra a faixa · prova: automática

- **Dado** uma loja sem pedido mínimo e sem desconto por pedido
- **Quando** a cliente abre a loja
- **Então** a faixa do atacado não aparece

### Vitrine da loja: cartão do produto e lista

**Descrição:** no modelo "grade", o cartão passa a ter foto em retrato, código, tamanhos
e selo, e os produtos formam uma lista só, que carrega mais ao rolar. O visual novo
substitui o modelo "grade" de hoje; "lista" e "destaque" continuam existindo, com o
topo, as categorias e a faixa novos.

**Componentes:**
- Foto em retrato: a primeira foto do produto, mais alta do que larga.
- Selo "Últimas unidades!": aparece no cartão do produto com pouco estoque.
- Código: "REF: " seguido do código do produto, quando o lojista preencheu.
- Nome e preço: como hoje, com o preço riscado quando há preço "de".
- Opções disponíveis: um quadradinho para cada opção do primeiro tipo de variação do
  produto (ex.: P, M, G); a opção sem estoque aparece riscada.
- Regras de venda: o resumo de grade fechada, faixa de preço e mínimo do produto, como hoje.
- Lista de produtos: uma lista só, sem títulos de categoria.

**Comportamentos:**
- Ver o cartão: a cliente vê foto, selo, código, nome, preço, opções e regras de venda.
- Abrir o produto: tocar em qualquer parte do cartão abre a página do produto.
- Rolar a lista: ao chegar perto do fim, mais produtos aparecem sozinhos.
- Buscar, ordenar e filtrar por estoque: funcionam sobre a lista inteira, como hoje.
- Voltar do produto: a cliente volta para o mesmo ponto da lista, com o mesmo filtro.

**Critérios de aceite:**

#### CA-B61-21 — O cartão mostra a foto em retrato · prova: manual

- **Dado** uma loja no modelo "grade" com produtos com foto, aberta no celular
- **Quando** a Marcelle olha a lista
- **Então** cada foto aparece mais alta do que larga (proporção 4 por 5), sem distorcer, em duas colunas

#### CA-B61-22 — O cartão mostra o código do produto · prova: automática

- **Dado** um produto com o código "00001090"
- **Quando** a cliente vê o cartão dele
- **Então** o cartão mostra "REF: 00001090" acima do nome

#### CA-B61-23 — Produto sem código não mostra "REF" · prova: automática

- **Dado** um produto sem código
- **Quando** a cliente vê o cartão dele
- **Então** o cartão não mostra a linha "REF"

#### CA-B61-24 — O cartão mostra as opções, com a esgotada riscada · prova: automática

- **Dado** um produto com tamanhos P, M e G, em que M está sem estoque
- **Quando** a cliente vê o cartão dele
- **Então** o cartão mostra P, M e G em quadradinhos, com M riscado

#### CA-B61-25 — Produto com dois tipos de variação mostra o primeiro e conta o segundo · prova: automática

- **Dado** um produto com Tamanho (P, M) e Cor (Preto, Branco), com Tamanho em primeiro
- **Quando** a cliente vê o cartão dele
- **Então** o cartão mostra P e M em quadradinhos e o texto "2 opções de cor"

#### CA-B61-26 — Opção só conta como esgotada quando não há estoque em nenhuma combinação · prova: automática

- **Dado** um produto com Tamanho e Cor em que o P tem estoque só na cor Preto
- **Quando** a cliente vê o cartão dele
- **Então** o P aparece sem risco

#### CA-B61-27 — Produto sem variação não mostra quadradinhos · prova: automática

- **Dado** um produto sem variação
- **Quando** a cliente vê o cartão dele
- **Então** o cartão não mostra quadradinhos de opção

#### CA-B61-28 — O selo "Últimas unidades!" aparece no limite que o lojista definiu · prova: automática

- **Dado** uma loja com o selo configurado para 5 peças, um produto com 5 peças no total e outro com 6
- **Quando** a cliente abre a loja
- **Então** o cartão do produto com 5 peças mostra "Últimas unidades!" e o do produto com 6 não mostra

#### CA-B61-29 — Produto esgotado mostra "Esgotado", não "Últimas unidades!" · prova: automática

- **Dado** uma loja com o selo configurado para 5 peças e um produto sem estoque
- **Quando** a cliente abre a loja
- **Então** o cartão dele mostra só "Esgotado"

#### CA-B61-30 — Sem limite configurado, nenhum cartão mostra o selo · prova: automática

- **Dado** uma loja com o campo do selo vazio e um produto com 1 peça
- **Quando** a cliente abre a loja
- **Então** nenhum cartão mostra "Últimas unidades!"

#### CA-B61-31 — As regras de venda continuam no cartão · prova: automática

- **Dado** um produto com grade fechada de 12 peças e outro com faixa de preço e mínimo de 6 peças
- **Quando** a cliente vê os cartões
- **Então** cada cartão mostra o mesmo resumo de regras que mostrava antes desta mudança

#### CA-B61-32 — O preço continua com vírgula · prova: automática

- **Dado** um produto de R$ 14,99
- **Quando** a cliente vê o cartão dele
- **Então** o preço aparece como "R$ 14,99"

#### CA-B61-33 — Tocar no cartão abre o produto · prova: automática

- **Dado** a lista de produtos
- **Quando** a cliente toca na foto, no nome ou em um quadradinho de opção de um cartão
- **Então** a página daquele produto abre, e nada é adicionado ao carrinho

#### CA-B61-34 — Os produtos formam uma lista só, sem título de categoria · prova: automática

- **Dado** uma loja no modelo "grade" com produtos em duas categorias e produtos sem categoria
- **Quando** a cliente abre a loja sem escolher categoria
- **Então** todos aparecem em uma lista só, na ordem do lojista, sem os títulos das categorias e sem "Mais produtos"

#### CA-B61-35 — A lista carrega mais produtos ao rolar · prova: automática

- **Dado** uma loja com 60 produtos visíveis
- **Quando** a cliente abre a loja e rola até o fim dos primeiros 24
- **Então** mais 24 aparecem sem ela tocar em nada, e o botão "Ver mais" não existe mais

#### CA-B61-36 — Busca, ordenação e "Só com estoque" valem para a lista inteira · prova: automática

- **Dado** uma loja com 60 produtos, em que só o 50º tem "veludo" no nome
- **Quando** a cliente busca "veludo"
- **Então** o produto aparece, mesmo sem ela ter rolado até ele

#### CA-B61-37 — Voltar do produto devolve a cliente ao mesmo ponto · prova: automática

- **Dado** a cliente com a categoria "Blusas" escolhida, depois de rolar até o 40º produto
- **Quando** ela abre esse produto e volta
- **Então** a lista está com "Blusas" escolhida, com o 40º produto carregado e na mesma altura da tela

#### CA-B61-38 — "Lista" e "destaque" continuam com os cartões de hoje · prova: automática

- **Dado** uma loja no modelo "lista" e outra no modelo "destaque"
- **Quando** a cliente abre cada uma
- **Então** os produtos aparecem com os cartões e as seções por categoria de antes desta mudança, abaixo do topo, das categorias e da faixa novos

#### CA-B61-39 — A prévia da Aparência mostra o visual novo · prova: automática

- **Dado** o lojista na tela de Aparência do catálogo, com o modelo "grade"
- **Quando** ele olha a prévia
- **Então** ela mostra o topo com a logo redonda, os círculos de categoria e os cartões em retrato, iguais aos da loja pública

### Página do produto

**Descrição:** a página do produto ganha código e preço em destaque, opção esgotada
riscada, as formas de entrega e de pagamento da loja e um aviso de compra pelo WhatsApp.
A compra continua pela grade de quantidades, com todos os tamanhos e cores de uma vez.

**Componentes:**
- Barra do produto: voltar, logo pequena e nome da loja, compartilhar e carrinho.
- Código: "REF: " e o código, acima do nome.
- Preço em destaque: maior que o nome.
- Grade de quantidades ou contador de grades: os de hoje.
- "Mais informações": descrição do produto, formas de entrega e formas de pagamento.
- Aviso de compra: "Compra segura · pedido finalizado no WhatsApp da loja", junto do
  botão de adicionar.

**Comportamentos:**
- Ver o código e o preço: a cliente vê "REF" e o preço em destaque.
- Ver a opção esgotada: a linha da grade sem estoque aparece riscada e não aceita quantidade.
- Escolher quantidades e adicionar: como hoje.
- Ver como recebe e como paga: a cliente lê as formas de entrega e de pagamento da loja.
- Compartilhar o produto: como hoje.

**Critérios de aceite:**

#### CA-B61-40 — A página mostra "REF" e o preço em destaque · prova: automática

- **Dado** um produto com o código "00001090" e preço de R$ 14,99
- **Quando** a cliente abre a página dele
- **Então** ela vê "REF: 00001090" acima do nome e "R$ 14,99" abaixo dele, em letra maior que a do nome

#### CA-B61-41 — Opção sem estoque aparece riscada e travada · prova: automática

- **Dado** um produto com tamanhos P, M e G, em que M está sem estoque
- **Quando** a cliente abre a página dele
- **Então** a linha do M aparece riscada, com "Esgotado", e não deixa pôr quantidade; P e G aceitam

#### CA-B61-42 — As formas de entrega e de pagamento da loja aparecem · prova: automática

- **Dado** uma loja com "Correios" e "Retirada no local" marcados em entrega, e "Pix" e "Cartão de crédito" em pagamento
- **Quando** a cliente abre a página de um produto
- **Então** ela vê "Formas de entrega" com Correios e Retirada no local, e "Formas de pagamento" com Pix e Cartão de crédito, e nenhuma outra opção

#### CA-B61-43 — Sem nada marcado, o bloco não aparece · prova: automática

- **Dado** uma loja sem nenhuma forma de entrega marcada e com "Pix" marcado em pagamento
- **Quando** a cliente abre a página de um produto
- **Então** "Formas de entrega" não aparece e "Formas de pagamento" mostra Pix

#### CA-B61-44 — O aviso de compra pelo WhatsApp aparece junto do botão · prova: automática

- **Dado** um produto com estoque
- **Quando** a cliente abre a página dele
- **Então** junto do botão de adicionar aparece "Compra segura · pedido finalizado no WhatsApp da loja"

#### CA-B61-45 — Comprar pela grade continua igual · prova: automática

- **Dado** um produto com Tamanho e Cor, outro com grade fechada e outro sem variação
- **Quando** a cliente escolhe as quantidades e adiciona cada um
- **Então** o carrinho recebe as mesmas peças, com os mesmos preços, faixas e mínimos de antes desta mudança

#### CA-B61-46 — A página do produto no celular fica próxima da referência · prova: manual

- **Dado** um produto com fotos, código, variações e descrição, em uma loja com entrega e pagamento marcados
- **Quando** a Marcelle abre a página no celular
- **Então** ela aprova a aparência: foto, "REF", nome, preço em destaque, grade, "Mais informações" e o botão preso ao pé da tela

### Rodapé e barra do WhatsApp

**Descrição:** a loja ganha um rodapé de confiança e uma barra presa ao pé da vitrine
lembrando que a compra fecha pelo WhatsApp.

**Componentes:**
- Barra do WhatsApp: presa ao pé da vitrine, com "Pedido enviado e finalizado pelo
  WhatsApp da loja".
- Rodapé: "Seu pedido será enviado para o WhatsApp da loja", as formas de entrega e de
  pagamento marcadas pelo lojista e "Catálogo digital · Compra assistida pelo WhatsApp
  da loja".

**Comportamentos:**
- Ver a barra: a cliente vê a barra ao pé da vitrine enquanto rola.
- Ler o rodapé: ao fim da lista, a cliente vê como a compra funciona.

**Critérios de aceite:**

#### CA-B61-47 — A barra do WhatsApp fica presa ao pé da vitrine · prova: automática

- **Dado** a vitrine de uma loja
- **Quando** a cliente abre a loja
- **Então** uma barra ao pé da tela mostra "Pedido enviado e finalizado pelo WhatsApp da loja"

#### CA-B61-48 — A barra não cobre o botão de adicionar nem o carrinho · prova: automática

- **Dado** a cliente na página de um produto, e depois com o carrinho aberto
- **Quando** ela olha o pé da tela
- **Então** a barra do WhatsApp não aparece nesses dois lugares, e o botão de adicionar e o de enviar o pedido ficam livres

#### CA-B61-49 — O rodapé mostra só a entrega e o pagamento que a loja marcou · prova: automática

- **Dado** uma loja com "Transportadora" marcada em entrega e nada em pagamento
- **Quando** a cliente chega ao fim da vitrine
- **Então** o rodapé mostra "Seu pedido será enviado para o WhatsApp da loja" e "Entrega: Transportadora", sem linha de pagamento e sem prometer entrega para todo o Brasil

### Painel do catálogo: Aparência

**Descrição:** a tela de Aparência ganha o campo do Instagram da loja.

**Componentes:**
- Campo "Instagram da loja (opcional)", na seção Marca.

**Comportamentos:**
- Preencher o Instagram: o lojista digita o @ da loja e salva.
- Apagar o Instagram: o lojista limpa o campo e salva.

**Critérios de aceite:**

#### CA-B61-50 — O lojista salva o Instagram e ele aparece na loja · prova: automática

- **Dado** o lojista na tela de Aparência
- **Quando** ele digita "lojateste" no campo do Instagram e salva
- **Então** a tela confirma que salvou e a loja pública passa a mostrar "@lojateste"

#### CA-B61-51 — O campo aceita @, link e só o nome · prova: automática

- **Dado** o campo do Instagram
- **Quando** o lojista salva "@lojateste", "https://instagram.com/lojateste/" ou "lojateste"
- **Então** nos três casos fica guardado o mesmo perfil, "lojateste"

#### CA-B61-52 — Instagram inválido é recusado com aviso · prova: automática

- **Dado** o campo do Instagram
- **Quando** o lojista digita "loja teste!" e salva
- **Então** a tela avisa "Use só letras, números, ponto e sublinhado, com até 30 caracteres." e nada é gravado (a recusa vale também para quem chama o salvamento sem passar pela tela)

#### CA-B61-53 — Limpar o campo tira o @ da loja · prova: automática

- **Dado** uma loja com Instagram salvo
- **Quando** o lojista apaga o campo e salva
- **Então** a loja pública deixa de mostrar o @

### Painel do catálogo: Categorias

**Descrição:** o painel de categorias da tela de Produtos passa a aceitar foto e
subcategorias, e o editor de produto passa a escolher a subcategoria.

**Componentes:**
- Foto da categoria: miniatura redonda ao lado do nome, com enviar, trocar e remover.
- Subcategorias: lista recolhida dentro de cada categoria, com criar, renomear, apagar e
  reordenar.
- Campo "Subcategoria" no editor de produto, abaixo de "Categoria".

**Comportamentos:**
- Enviar a foto de uma categoria.
- Trocar a foto de uma categoria.
- Remover a foto de uma categoria.
- Criar uma subcategoria dentro de uma categoria.
- Renomear uma subcategoria.
- Reordenar as subcategorias de uma categoria.
- Apagar uma subcategoria.
- Apagar uma categoria que tem subcategorias.
- Escolher a subcategoria de um produto.
- Trocar a categoria de um produto que tinha subcategoria.

**Critérios de aceite:**

#### CA-B61-54 — O lojista envia a foto da categoria · prova: automática

- **Dado** a categoria "Blusas" sem foto
- **Quando** o lojista envia uma imagem JPG de 1 MB para ela
- **Então** a miniatura da categoria passa a mostrar a imagem e a loja pública usa essa foto no círculo "Blusas"

#### CA-B61-55 — Arquivo que não é imagem ou é grande demais é recusado · prova: automática

- **Dado** a categoria "Blusas"
- **Quando** o lojista tenta enviar um PDF, ou uma imagem acima do limite que já vale para a logo
- **Então** a tela mostra o mesmo aviso que a logo mostra nesses casos e a foto da categoria não muda (a recusa vale também no servidor)

#### CA-B61-56 — Trocar e remover a foto da categoria · prova: automática

- **Dado** a categoria "Blusas" com foto
- **Quando** o lojista envia outra imagem, e depois remove a foto
- **Então** depois da troca a loja mostra a imagem nova; depois de remover, o círculo volta a usar a foto do primeiro produto da categoria

#### CA-B61-57 — O lojista cria uma subcategoria · prova: automática

- **Dado** a categoria "Blusas" sem subcategorias
- **Quando** o lojista cria "Manga curta" dentro dela
- **Então** "Manga curta" aparece na lista de subcategorias de "Blusas" e fica disponível no editor de produto

#### CA-B61-58 — Nome repetido ou vazio na mesma categoria é recusado · prova: automática

- **Dado** "Blusas" com a subcategoria "Manga curta"
- **Quando** o lojista tenta criar "manga curta" de novo, ou uma subcategoria sem nome
- **Então** a tela avisa "Já existe uma subcategoria com esse nome." ou "Dê um nome à subcategoria.", e nada é criado (a recusa vale também no servidor)

#### CA-B61-59 — O mesmo nome vale em categorias diferentes · prova: automática

- **Dado** "Blusas" com a subcategoria "Básicas"
- **Quando** o lojista cria "Básicas" dentro de "Calças"
- **Então** a subcategoria é criada

#### CA-B61-60 — Renomear e reordenar subcategorias · prova: automática

- **Dado** "Blusas" com "Manga curta" e "Manga longa", nessa ordem
- **Quando** o lojista renomeia "Manga curta" para "Curta" e a arrasta para depois de "Manga longa"
- **Então** a loja pública mostra os chips "Todas", "Manga longa" e "Curta", nessa ordem

#### CA-B61-61 — Apagar a subcategoria mantém os produtos na categoria · prova: automática

- **Dado** "Manga curta", de "Blusas", com 3 produtos
- **Quando** o lojista apaga "Manga curta" e confirma no aviso, que diz quantos produtos ela tem
- **Então** a subcategoria some e os 3 produtos continuam em "Blusas", sem subcategoria

#### CA-B61-62 — Apagar a categoria apaga as subcategorias dela · prova: automática

- **Dado** "Blusas" com duas subcategorias e 5 produtos
- **Quando** o lojista apaga "Blusas" e confirma
- **Então** a categoria e as duas subcategorias somem, e os 5 produtos ficam sem categoria e sem subcategoria, como já acontece hoje com a categoria

#### CA-B61-63 — O produto escolhe uma subcategoria da própria categoria · prova: automática

- **Dado** um produto em "Blusas", que tem "Manga curta" e "Manga longa"
- **Quando** o lojista abre o editor do produto
- **Então** o campo "Subcategoria" oferece "Nenhuma", "Manga curta" e "Manga longa", e nenhuma subcategoria de outra categoria

#### CA-B61-64 — Trocar a categoria do produto limpa a subcategoria · prova: automática

- **Dado** um produto em "Blusas" / "Manga curta"
- **Quando** o lojista troca a categoria para "Calças" e salva
- **Então** o produto fica em "Calças" sem subcategoria (o servidor recusa gravar subcategoria que não é da categoria do produto)

#### CA-B61-65 — Produto sem categoria não escolhe subcategoria · prova: automática

- **Dado** um produto sem categoria
- **Quando** o lojista abre o editor dele
- **Então** o campo "Subcategoria" aparece desligado, com o texto "Escolha uma categoria primeiro"

#### CA-B61-66 — Uma empresa não vê nem mexe nas subcategorias e fotos de outra · prova: automática

- **Dado** duas empresas, cada uma com categorias, subcategorias e fotos de categoria (conferido antes que os dados das duas existem)
- **Quando** o lojista da primeira lista as subcategorias, ou tenta renomear, apagar ou pôr foto usando o identificador de uma categoria da segunda
- **Então** ele vê só as da própria empresa, e as tentativas na outra não mudam nada

### Painel do catálogo: Configurações

**Descrição:** a tela de Configurações do catálogo ganha o limite do selo "Últimas
unidades!" e as formas de entrega e de pagamento.

**Componentes:**
- Seção "Selo Últimas unidades · opcional": campo "Mostrar com quantas peças ou menos".
- Seção "Formas de entrega · opcional": caixas para marcar Correios, Transportadora,
  Retirada no local e Excursão.
- Seção "Formas de pagamento · opcional": caixas para marcar Pix, Cartão de crédito,
  Boleto e Dinheiro.

**Comportamentos:**
- Definir o limite do selo.
- Desligar o selo, deixando o campo vazio.
- Marcar e desmarcar formas de entrega.
- Marcar e desmarcar formas de pagamento.

**Critérios de aceite:**

#### CA-B61-67 — O lojista define o limite do selo · prova: automática

- **Dado** o lojista na tela de Configurações do catálogo
- **Quando** ele digita 5 no campo do selo e salva
- **Então** a tela confirma que salvou e, na loja, os produtos com 5 peças ou menos no total passam a mostrar "Últimas unidades!"

#### CA-B61-68 — Limite inválido é recusado · prova: automática

- **Dado** o campo do selo
- **Quando** o lojista digita 0, um número negativo, um número com vírgula ou um número acima de 999 e salva
- **Então** a tela avisa "Use um número inteiro de 1 a 999, ou deixe vazio para não mostrar o selo." e nada é gravado (a recusa vale também no servidor)

#### CA-B61-69 — Campo vazio desliga o selo · prova: automática

- **Dado** uma loja com o selo em 5 peças
- **Quando** o lojista apaga o campo e salva
- **Então** nenhum cartão da loja mostra "Últimas unidades!"

#### CA-B61-70 — O lojista marca as formas de entrega e de pagamento · prova: automática

- **Dado** o lojista na tela de Configurações, com nada marcado
- **Quando** ele marca "Correios" e "Excursão" em entrega, "Pix" em pagamento, e salva
- **Então** ao reabrir a tela as três caixas continuam marcadas, e a página de produto da loja mostra exatamente essas três

#### CA-B61-71 — Forma fora da lista é recusada · prova: automática

- **Dado** as listas de entrega e de pagamento
- **Quando** alguém chama o salvamento com uma forma que não está na lista (ex.: "Drone")
- **Então** o servidor recusa e as formas gravadas não mudam

#### CA-B61-72 — Loja já publicada continua funcionando sem preencher nada · prova: automática

- **Dado** uma loja publicada antes desta mudança, sem Instagram, sem foto de categoria, sem subcategoria, sem limite de selo e sem entrega e pagamento marcados
- **Quando** a cliente abre a loja e um produto
- **Então** as duas páginas abrem no visual novo, sem @, sem selo, sem chips de subcategoria e sem os blocos de entrega e pagamento, e ela consegue fazer um pedido

### Aprovação visual

**Critérios de aceite:**

#### CA-B61-73 — A vitrine no celular fica próxima da referência · prova: manual

- **Dado** a loja da empresa de teste com banner, logo, Instagram, categorias com foto e subcategorias, produtos com foto e variações, selo, entrega e pagamento
- **Quando** a Marcelle abre a loja no celular, ao lado da referência
- **Então** ela aprova: banner de largura total, logo redonda, nome, @, boas-vindas, compartilhar, busca, categorias em círculo, faixa do atacado, cartões em retrato e barra do WhatsApp

#### CA-B61-74 — A vitrine no computador continua boa · prova: manual

- **Dado** a mesma loja aberta no computador
- **Quando** a Marcelle olha a vitrine e um produto
- **Então** ela aprova: o topo alinhado à esquerda (logo à esquerda sobre o banner, nome, @ e boas-vindas ao lado, "Compartilhar catálogo" na ponta direita), busca, categorias e produtos na coluna de largura máxima de hoje, com até 4 colunas de produtos, e a página do produto em duas colunas, sem nada esticado ou cortado

#### CA-B61-75 — As cores e a fonte do lojista valem no visual novo · prova: manual

- **Dado** uma loja com cor principal escura e fundo claro, e outra com fundo escuro
- **Quando** a Marcelle abre as duas
- **Então** topo, círculos, faixa, cartões, selo, quadradinhos, rodapé e barra do WhatsApp usam as cores e a fonte de cada loja, e todo texto fica legível

## Fora de escopo

- Pedir nome e WhatsApp antes de adicionar ao carrinho, e o contato entrar no CRM nessa hora: é a série seguinte.
- Reservar estoque por tempo ("reserva garantida por 30 min").
- Calcular frete.
- Conta da cliente na loja ("Minha conta") e menu lateral.
- Adicionar ao carrinho direto do cartão, sem abrir o produto. A compra continua pela grade de quantidades na página do produto.
- Selo de loja verificada ao lado do nome.
- Mudar os cartões e as seções dos modelos "lista" e "destaque".
- Mudar o carrinho, o envio do pedido, a mensagem do WhatsApp e a tela de pedidos do CRM.
- Subcategoria dentro de subcategoria: são só dois níveis.
- Formas de entrega e de pagamento fora da lista pronta, e qualquer cobrança dentro da loja.
- Subcategoria e foto de categoria na importação de produtos por planilha.
- Filtrar por subcategoria na lista de produtos do painel.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-01 | "Os outros pontos também" foi lido como o recorte recomendado na conversa (topo, categorias, faixa do atacado, cartão, lista contínua, página do produto, rodapé e barra), e não como frete, conta da cliente ou identificação antes do carrinho. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-02 | Os quadradinhos de opção no cartão são só informação: tocar neles abre o produto. Na referência eles escolhem o tamanho para comprar pelo cartão, o que ficou fora. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-03 | O cartão mostra em quadradinhos o primeiro tipo de variação do produto (o que o lojista cadastrou primeiro) e resume o segundo em texto ("2 opções de cor"). | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-04 | "Últimas unidades!" conta o estoque total do produto, somando todas as combinações, e não cada tamanho em separado. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-05 | A lista pronta é: entrega com Correios, Transportadora, Retirada no local e Excursão; pagamento com Pix, Cartão de crédito, Boleto e Dinheiro. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-06 | O rodapé não promete "Entrega para todo o Brasil" nem "Compra 100% segura" para toda loja: mostra só o que o lojista marcou, mais os textos sobre o WhatsApp. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-07 | Os textos fixos da barra e do rodapé são iguais para todas as lojas; o lojista não edita. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-08 | A lista contínua vale só no modelo "grade"; ela carrega de 24 em 24. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-09 | A foto da categoria segue os mesmos formatos e o mesmo tamanho máximo da logo. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-10 | Loja sem logo mostra a inicial do nome no círculo, em vez de esconder o círculo. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-11 | A referência foi vista só no celular. No computador, o visual novo é o mesmo desenho, centralizado e com mais colunas, sem um modelo próprio. | invalidada | No computador o topo não é centralizado: fica alinhado à esquerda (ver a pergunta PER-B61-06). Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-01 | O visual novo substitui o modelo "grade", vira o único modelo ou entra como quarto modelo? | respondida | Substitui a "grade"; "lista" e "destaque" continuam. Marcelle, 10/11/2026. |
| PER-B61-02 | Quando o selo "Últimas unidades!" aparece? | respondida | O lojista define o número de peças nas configurações; vazio desliga. Marcelle, 10/11/2026. |
| PER-B61-03 | De onde vêm as formas de entrega e de pagamento? | respondida | De uma lista pronta que o lojista marca; só aparece o que ele marcar. Marcelle, 10/11/2026. |
| PER-B61-04 | Qual foto vai no círculo da categoria? | respondida | A enviada pelo lojista; sem ela, a do primeiro produto da categoria. Marcelle, 10/11/2026. |
| PER-B61-05 | O banner continua? | respondida | Sim, de largura total, estilo e-commerce, com a logo redonda sobre ele. Marcelle, 10/11/2026. |
| PER-B61-06 | No computador, como ficam o topo e o conteúdo? | respondida | Topo alinhado à esquerda: logo redonda à esquerda sobre o banner, nome, @ e boas-vindas ao lado dela, "Compartilhar catálogo" na ponta direita. Busca, categorias e produtos continuam na coluna de largura máxima de hoje, com até 4 colunas de produtos. No celular o topo é centralizado. Marcelle, 10/11/2026. |
| PER-B61-07 | O texto de boas-vindas aceita hoje 140 caracteres; o limite muda? | respondida | Sobe para 300, para caber uma bio como a da referência; a loja mostra duas linhas e o "ver mais" abre o resto. Marcelle, 10/11/2026. |
| PER-B61-08 | Como a logo entra no círculo, se muitas logos são largas? | respondida | Inteira dentro do círculo, sem corte, sobre fundo branco redondo; o painel passa a sugerir imagem quadrada. Marcelle, 10/11/2026. |
