# Spec: Compra por grade na vitrine

## Visão Geral

No atacado, a cliente compra várias combinações do mesmo produto de uma vez (ex.: 2 P,
2 M e 1 G na cor Areia, mais 1 P na cor Preto). Hoje a página do produto da vitrine pede
uma combinação por vez: escolher o tamanho, escolher a cor, ajustar a quantidade e
adicionar. Para montar uma grade de 6 combinações, são 6 rodadas.

Esta mudança troca esse jeito pela **grade**: a página do produto mostra, de uma vez, todas
as combinações do produto, cada uma com sua quantidade, e um único botão adiciona tudo ao
carrinho. É o único jeito de comprar produto com variação; não existe mais o seletor
"escolha tamanho e cor".

Para quem é: a cliente da loja comprando pelo celular, quase sempre com uma mão.

Fica de fora (fase 2): grade fechada ou pacote definido pela lojista, preço por faixa de
quantidade, compra por grade direto da vitrine (sem abrir o produto).

Decisões da usuária (04/10):
- Grade sempre, um jeito só.
- No celular, lista agrupada por cor (não tabela com rolagem para o lado).
- Sem pacote nesta versão.
- Cada combinação trava no estoque disponível.

## Páginas / Módulos

### Página do produto na vitrine (`/loja/<endereço>/p/<produto>`)

**Descrição:** Mostra fotos, nome, preço e descrição do produto, como hoje. No lugar dos
botões de opção e da quantidade única, mostra a grade de quantidades e o botão de
adicionar.

**Componentes:**
- **Resumo do mínimo**: linha curta no topo da grade com o pedido mínimo da loja
  (ex.: "Pedido mínimo da loja: 6 peças" ou "R$ 300,00"). Não aparece quando a loja não tem
  mínimo.
- **Grade de quantidades — produto com dois tipos de variação**: um bloco por opção do
  segundo tipo (ex.: um bloco "Areia", um bloco "Preto"), com o nome do tipo e da opção como
  título do bloco. Dentro de cada bloco, uma linha por opção do primeiro tipo (ex.: P, M,
  G), na ordem cadastrada pela lojista.
- **Grade de quantidades — produto com um tipo de variação**: uma lista só, uma linha por
  opção (ex.: P, M, G), com o nome do tipo como título.
- **Linha da grade**: nome da opção, botão −, quantidade escolhida, botão + e, à direita,
  uma indicação curta de disponibilidade quando relevante (ex.: "3 disponíveis" quando
  restam poucas; "esgotado"; "todas já no carrinho").
- **Linha esgotada**: nome riscado, botões travados, texto "esgotado".
- **Bloco esgotado**: quando todas as linhas de um bloco estão esgotadas, o bloco aparece
  recolhido numa linha só ("Preto · esgotado").
- **Total do bloco**: ao lado do título de cada bloco, quantas peças foram escolhidas
  naquele bloco (só aparece quando é mais que zero).
- **Produto sem variação**: continua com uma quantidade só (−, quantidade, +), sem grade.
- **Botão Adicionar**: fixo no rodapé da tela no celular, sempre visível enquanto a cliente
  rola a grade. Mostra o total escolhido: "Adicionar 5 peças · R$ 449,50". Com nada
  escolhido, mostra "Escolha as quantidades" e fica travado.
- **Aviso de adicionado**: depois de adicionar, mensagem "5 peças adicionadas" com o link
  "Ver carrinho".
- **Produto inteiro esgotado**: no lugar da grade, a mensagem "Produto esgotado no
  momento", como hoje.

**Comportamentos:**
- **Ver a grade**: ao abrir um produto com variação, a cliente vê todas as combinações já
  com quantidade zero, sem precisar escolher nada antes.
- **Aumentar a quantidade de uma combinação**: tocar no + soma 1 peça àquela combinação.
- **Diminuir a quantidade de uma combinação**: tocar no − tira 1 peça; não desce de zero
  (em zero, o − fica travado).
- **Digitar a quantidade**: tocar no número permite digitar a quantidade direto (útil para
  quantidades grandes, como 24); valor acima do disponível vira o máximo disponível, valor
  vazio ou inválido vira zero.
- **Travar no estoque**: o + de uma combinação trava quando a quantidade escolhida chega ao
  estoque disponível dela, já descontando o que essa combinação tem no carrinho.
- **Combinação esgotada**: combinação sem estoque (ou com todo o estoque já no carrinho)
  não aceita quantidade; os botões ficam travados e a linha diz por quê.
- **Ver o total enquanto monta**: a cada mudança, o botão Adicionar atualiza o total de
  peças e o valor (preço do produto × peças escolhidas).
- **Ver o total de cada bloco**: a cada mudança, o título do bloco mostra quantas peças
  foram escolhidas naquela cor.
- **Adicionar a grade ao carrinho**: tocar em Adicionar coloca no carrinho cada combinação
  com quantidade maior que zero; se a combinação já estava no carrinho, soma à quantidade
  que já havia.
- **Zerar a grade depois de adicionar**: depois de adicionar, todas as quantidades da grade
  voltam a zero e os limites de disponibilidade se atualizam (o que foi para o carrinho
  deixa de estar disponível).
- **Confirmar que adicionou**: depois de adicionar, aparece o aviso "N peças adicionadas"
  e o contador do carrinho no topo atualiza.
- **Abrir o carrinho pelo aviso**: tocar em "Ver carrinho" abre o carrinho.
- **Ver o mínimo da loja**: a cliente vê o pedido mínimo da loja no topo da grade enquanto
  escolhe, sem precisar voltar para a vitrine.
- **Sair sem adicionar**: se a cliente voltar para a loja com quantidades escolhidas e não
  adicionadas, elas se perdem (a grade não é guardada); o carrinho não muda.
- **Produto sem variação**: a cliente ajusta uma quantidade (mínimo 1) e toca em
  "Adicionar N peças · R$ total", como hoje, com o mesmo botão fixo no rodapé.
- **Usar com teclado e leitor de tela**: cada + e − diz qual combinação altera
  (ex.: "Aumentar Areia, M"); a quantidade de cada linha é anunciada quando muda; a linha
  esgotada é anunciada como indisponível.
- **Usar com uma mão**: botões −/+ e o botão Adicionar têm tamanho de toque confortável
  (mínimo 44px); a grade não exige rolar para o lado em nenhuma largura de tela.

### Página do produto no computador

**Descrição:** Mesma grade e mesmos comportamentos, ao lado das fotos.

**Componentes:**
- **Grade em coluna**: os blocos ficam um embaixo do outro (lado a lado ficou apertado); cada bloco
  continua com as linhas uma embaixo da outra.
- **Botão Adicionar**: logo abaixo da grade (não fixo no rodapé).

**Comportamentos:**
- Todos os da página do produto no celular.

### Carrinho (já existe)

**Descrição:** Não muda. Cada combinação adicionada pela grade vira uma linha do carrinho,
como hoje.

**Comportamentos:**
- **Receber várias linhas de uma vez**: depois de adicionar uma grade com 4 combinações, o
  carrinho mostra 4 linhas daquele produto, cada uma com a variação e a quantidade.
