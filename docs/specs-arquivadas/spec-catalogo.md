# Spec: Catálogo da loja (vitrine com a marca do lojista)

> Decidido pela Marcelle em 03/10/2026. Triagem: **arquitetural** — subsistema novo
> (produtos, vitrine pública, carrinho, pedidos) e a primeira página do CRM aberta sem
> login e com a marca do cliente. Referência de mercado: AtacadoPro
> (atacadopro.com) — vitrine com a marca da loja, grade com estoque em tempo real e link
> único para o WhatsApp. Os textos de venda do CRM não devem copiar os deles.

## Visão Geral

O lojista (a empresa que usa o CRM) monta, dentro do CRM, um catálogo dos seus produtos
e ganha um link público para mandar no WhatsApp, nos stories e na bio do Instagram. A
cliente do lojista abre o link, vê a vitrine **com a marca da loja** (logo, cores, fonte e
layout escolhidos por ela — nenhuma marca do CRM aparece), escolhe produtos e variações,
monta um carrinho, informa nome e WhatsApp e clica em **Fazer pedido**. O pedido fica
registrado no CRM e o WhatsApp da loja abre com a mensagem do pedido pronta.

Problema que resolve: o atacadista hoje manda fotos soltas e tabela em PDF, a cliente
responde "quero 3 do azul M" no meio da conversa e o vendedor monta o pedido na mão.
Com o catálogo, o pedido chega organizado, com itens, variações, quantidades e total.

Para quem é:
- **Admin e Gerente**: cadastram produtos, personalizam a vitrine, configuram o catálogo
  e veem/atualizam pedidos.
- **Atendente**: vê os pedidos e muda a situação; não edita produtos nem a vitrine.
- **Cliente final** (sem login): navega na vitrine, monta o carrinho e faz o pedido.

### Decisões

- **Um catálogo por empresa**, num endereço público do CRM:
  `/loja/<endereço-da-loja>` (o lojista escolhe o endereço). Domínio próprio da loja fica
  para a fase 2.
- **Produto**: nome, descrição, fotos, preço, categoria, variações (ex.: Tamanho e Cor) e
  estoque por combinação de variação.
- **Pedido mínimo configurável por loja**: sem mínimo, mínimo de N peças ou mínimo de
  R$ X no pedido.
- **Estoque**: cada combinação (ex.: M / Azul) tem quantidade. Com zero, a combinação
  aparece indisponível na vitrine. O estoque **baixa quando o vendedor marca o pedido
  como Fechado** (ação manual, visível) e **volta** se um pedido Fechado for cancelado.
  Enviar o pedido não baixa estoque.
- **Pedido no CRM**: registrado antes de abrir o WhatsApp, com número, itens, variações,
  quantidades, preços e total. Situação manual: **Novo → Em atendimento → Fechado** ou
  **Cancelado**. Nada muda de situação sozinho.
- **Cliente do pedido**: a cliente informa nome e WhatsApp no carrinho. O pedido é
  ligado ao contato com esse WhatsApp; se não existir, o contato é criado com esses dados.
  O pedido **não cria card nem move funil** (sem automação embutida — se a loja quiser
  isso, vira automação configurável na fase 2).
- **WhatsApp que recebe o pedido**: o lojista escolhe um dos números conectados ao CRM.
- **Personalização**: logo, banner de capa (opcional), cor principal, cor de fundo, fonte
  (de uma lista curada), modelo de layout (Grade, Lista ou Destaque) e organização
  (categorias e ordem de categorias e produtos).

### Fora desta versão (fase 2)

Preço por faixa de quantidade e tabelas de preço por cliente; domínio próprio; pagamento
e frete; acompanhamento de entrega; automações disparadas por pedido; curva de produtos;
importação de produtos por planilha.

## Páginas / Módulos

### Produtos (`/catalogo`)

**Descrição:** lista dos produtos do catálogo da empresa, por categoria.

**Componentes:**
- Barra de topo: busca por nome, filtro por categoria, filtro "visíveis / ocultos",
  botão **Novo produto** (Admin/Gerente) e link **Ver minha loja** (abre a vitrine
  pública numa aba nova).
- Lista de produtos: foto principal, nome, categoria, preço, estoque total, selo
  "Oculto" e selo "Esgotado" (todas as combinações em zero).
- Gestão de categorias: lista de categorias com nome e ordem, criar, renomear, excluir
  (produtos da categoria excluída ficam "Sem categoria") e reordenar arrastando.
- Ordem dos produtos dentro da categoria: arrastar para reordenar.
- Estado vazio: explica o catálogo e oferece **Cadastrar o primeiro produto**.

**Comportamentos:**
- Buscar produto por nome.
- Filtrar por categoria.
- Filtrar visíveis / ocultos.
- Abrir produto para editar.
- Ocultar/mostrar produto na vitrine com um clique, sem abrir o produto.
- Criar categoria.
- Renomear categoria.
- Excluir categoria (pede confirmação; produtos vão para "Sem categoria").
- Reordenar categorias arrastando.
- Reordenar produtos dentro da categoria arrastando.
- Abrir a vitrine pública.
- Atendente não acessa esta página (o menu do catálogo mostra só Pedidos para ele).

### Editor de produto (`/catalogo/produtos/[id]`, `nova` para criar)

**Descrição:** cadastro e edição de um produto. Admin e Gerente.

**Componentes:**
- Campos: nome (obrigatório), descrição (texto com quebras de linha), preço (R$,
  obrigatório, maior que zero), preço "de" opcional (aparece riscado na vitrine),
  categoria, código/SKU opcional.
- Fotos: até 8; enviar várias de uma vez (JPG, PNG ou WebP, até 5 MB cada); reordenar
  arrastando (a primeira é a principal); remover.
- Variações: até 2 tipos (ex.: "Tamanho" e "Cor"), cada um com suas opções (ex.: P, M,
  G). Produto sem variação também é permitido.
- Grade de estoque: uma linha por combinação (ex.: P/Azul, P/Preto, M/Azul…) com a
  quantidade em estoque. Sem variação, um campo de estoque único.
- Visível na vitrine (liga/desliga) e Destaque (aparece no topo do modelo Destaque).
- Botões Salvar, Cancelar e Excluir produto.

**Comportamentos:**
- Criar produto com os campos obrigatórios.
- Ver erro ao salvar sem nome ou com preço vazio/zero.
- Enviar fotos; ver progresso; ver erro de arquivo grande demais ou de formato errado.
- Reordenar fotos.
- Remover foto.
- Adicionar tipo de variação e suas opções.
- Remover opção de variação (a combinação some da grade; pede confirmação se tinha estoque).
- Preencher o estoque de cada combinação.
- Marcar produto como visível/oculto.
- Marcar produto como destaque.
- Salvar e voltar para a lista.
- Excluir produto (pede confirmação; some da vitrine; pedidos antigos continuam mostrando
  o item com o nome e o preço da época).

### Aparência da loja (`/catalogo/aparencia`)

**Descrição:** personalização da vitrine com a marca do lojista. Admin e Gerente.

**Componentes:**
- Logo: enviar (PNG, JPG, SVG ou WebP), trocar, remover.
- Banner de capa opcional: enviar, trocar, remover.
- Nome da loja (aparece na vitrine e no título da aba).
- Texto de boas-vindas opcional (uma ou duas linhas abaixo do nome).
- Cor principal (botões, preços, destaques) e cor de fundo; aviso quando o contraste
  entre texto e fundo fica difícil de ler.
- Fonte: escolha numa lista curada (ex.: 8 fontes de estilos diferentes), cada uma
  mostrada com uma amostra.
- Modelo de layout: **Grade** (cartões em colunas), **Lista** (foto ao lado do texto) ou
  **Destaque** (produtos em destaque no topo, depois as categorias).
- Prévia ao vivo da vitrine (celular e computador) com as escolhas atuais.
- Botões Salvar e Descartar alterações.

**Comportamentos:**
- Enviar e trocar logo.
- Enviar, trocar e remover banner.
- Editar nome e texto de boas-vindas.
- Escolher cor principal e cor de fundo; ver aviso de contraste.
- Escolher fonte.
- Escolher modelo de layout.
- Ver a prévia mudar a cada escolha, antes de salvar.
- Alternar a prévia entre celular e computador.
- Salvar (a vitrine pública passa a usar as escolhas novas).
- Descartar alterações não salvas.

### Configurações do catálogo (`/catalogo/configuracoes`)

**Descrição:** endereço, número, pedido mínimo e publicação. Admin e Gerente.

**Componentes:**
- Endereço da loja: `.../loja/<endereço>` — letras minúsculas, números e hífen; mostra
  se está disponível; botão **Copiar link**.
- Número que recebe os pedidos: escolha entre os números conectados da empresa.
- Pedido mínimo: Sem mínimo / Mínimo de N peças / Mínimo de R$ X.
- Mensagem de fechamento opcional (texto que vai no fim da mensagem do pedido, ex.:
  "Formas de pagamento: Pix e boleto").
- Catálogo publicado (liga/desliga).

**Comportamentos:**
- Escolher o endereço; ver erro se já estiver em uso ou com caractere inválido.
- Copiar o link da loja.
- Escolher o número que recebe os pedidos.
- Definir o pedido mínimo.
- Escrever a mensagem de fechamento.
- Publicar o catálogo (exige endereço e número escolhidos; sem eles, o botão explica o
  que falta).
- Despublicar o catálogo (o link passa a mostrar "Catálogo indisponível no momento").
- Trocar o endereço (o link antigo deixa de funcionar; pede confirmação avisando isso).

### Pedidos (`/catalogo/pedidos`)

**Descrição:** pedidos recebidos pela vitrine. Todos os papéis.

**Componentes:**
- Lista: número do pedido, data e hora (Brasília), cliente (nome e WhatsApp), quantidade
  de peças, total, situação.
- Filtros: situação, período, busca por nome ou WhatsApp da cliente.
- Contador de pedidos **Novos** no menu do CRM.
- Detalhe do pedido: itens (foto, nome, variação, quantidade, preço unitário, subtotal),
  total, dados da cliente, link para o perfil do contato e para a conversa no chat,
  histórico de mudanças de situação (quem e quando).

**Comportamentos:**
- Ver a lista de pedidos, do mais novo para o mais antigo.
- Filtrar por situação.
- Filtrar por período.
- Buscar por nome ou WhatsApp.
- Abrir o detalhe do pedido.
- Mudar a situação: Novo → Em atendimento → Fechado, ou Cancelado.
- Marcar como Fechado: o estoque das combinações do pedido baixa; se alguma combinação
  não tiver estoque suficiente, o CRM avisa quais e pede confirmação (o estoque não fica
  negativo — vai a zero).
- Cancelar um pedido Fechado: o estoque baixado volta.
- Abrir o perfil do contato do pedido.
- Abrir a conversa com a cliente no chat.

### Perfil do contato (`/contatos/[id]`)

**Descrição:** o contato mostra os pedidos que fez pelo catálogo.

**Componentes:**
- Seção "Pedidos do catálogo": número, data, total e situação de cada pedido, com link
  para o detalhe.
- Linha do tempo: evento "Pedido #N recebido pelo catálogo".

**Comportamentos:**
- Ver os pedidos do contato.
- Abrir um pedido a partir do perfil.

### Vitrine pública (`/loja/[endereço]`)

**Descrição:** a loja online da marca do lojista, sem login. Funciona bem no celular
(onde a maioria das clientes vai abrir) e no computador.

**Componentes:**
- Cabeçalho com a logo, o nome da loja e o ícone do carrinho com a quantidade de peças.
- Banner de capa e texto de boas-vindas, se houver.
- Navegação por categorias (na ordem do lojista) e busca por nome.
- Produtos no modelo de layout escolhido: foto principal, nome, preço (e preço "de"
  riscado, se houver), selo "Esgotado" quando todas as combinações estão em zero.
- Aviso do pedido mínimo, quando houver ("Pedido mínimo: 12 peças").
- Visual 100% da loja: cores, fonte e logo do lojista; nenhuma marca do CRM.
- Ao compartilhar o link no WhatsApp, a prévia mostra o nome e a logo da loja.
- Catálogo despublicado ou endereço inexistente: página simples "Catálogo indisponível
  no momento".

**Comportamentos:**
- Navegar por categoria.
- Buscar produto por nome.
- Abrir um produto.
- Abrir o carrinho.
- Ver a vitrine com as mudanças de aparência que o lojista salvou.

### Página do produto (`/loja/[endereço]/p/[produto]`)

**Componentes:**
- Galeria de fotos (deslizar no celular, ampliar ao tocar).
- Nome, preço, descrição.
- Escolha de variação (ex.: Tamanho e Cor); combinação sem estoque aparece indisponível
  e não pode ser escolhida.
- Quantidade (não passa do estoque da combinação).
- Botão **Adicionar ao carrinho**.

**Comportamentos:**
- Ver as fotos.
- Escolher variação.
- Ver que uma combinação está indisponível.
- Escolher a quantidade (limitada ao estoque).
- Adicionar ao carrinho e ver a confirmação ("Adicionado").
- Voltar para a vitrine.

### Carrinho e pedido (na vitrine)

**Componentes:**
- Lista de itens: foto, nome, variação, quantidade (alterável), subtotal, remover.
- Total de peças e valor total.
- Barra do pedido mínimo: quanto falta (ex.: "Faltam 4 peças" / "Faltam R$ 120,00").
- Campos: nome e WhatsApp da cliente (obrigatórios).
- Botão **Fazer pedido**.
- Confirmação: "Pedido #N enviado. Se o WhatsApp não abriu, toque aqui."

**Comportamentos:**
- Alterar a quantidade de um item (limitada ao estoque).
- Remover um item.
- Ver o total atualizar.
- Ver quanto falta para o pedido mínimo; o botão Fazer pedido fica desabilitado até
  atingir o mínimo.
- Preencher nome e WhatsApp; ver erro se o WhatsApp for inválido.
- Fazer pedido: o pedido é registrado no CRM e o WhatsApp da loja abre com a mensagem
  pronta (número do pedido, itens com variação e quantidade, total, nome da cliente e a
  mensagem de fechamento da loja).
- Ver erro se um item ficou sem estoque desde que entrou no carrinho (o carrinho mostra
  qual e pede para ajustar antes de enviar).
- Carrinho guardado no aparelho da cliente: fechar e reabrir o link mantém os itens.
- Depois do pedido, o carrinho é esvaziado.
- Pedidos repetidos em sequência do mesmo WhatsApp são barrados por alguns minutos
  (proteção contra abuso), com mensagem explicando.

### Menu do CRM

**Componentes:**
- Item **Catálogo** com Produtos, Aparência, Configurações e Pedidos (Atendente vê só
  Pedidos), com o contador de pedidos Novos.

**Comportamentos:**
- Navegar entre as telas do catálogo.
- Ver quantos pedidos Novos há.
