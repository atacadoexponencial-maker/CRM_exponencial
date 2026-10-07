# Spec: Importar produtos por planilha

## Visão Geral

Hoje a lojista cadastra os produtos do catálogo um por um. Quem tem 200 peças leva horas para
montar a loja. Esta mudança permite **importar os produtos de uma planilha**: a lojista
baixa um modelo, preenche no Excel ou no Google Planilhas, envia o arquivo, confere uma
prévia com o que vai entrar e os erros de cada linha, e confirma.

A mesma planilha serve para **atualizar**: reimportar com o mesmo código atualiza o
produto que já existe (preço, estoque, descrição...), em vez de criar outro.

Para quem é: Admin e Gerente da empresa (os mesmos que já podem cadastrar produtos).

Fica de fora nesta versão: exportar o catálogo para planilha, importar de outros sistemas
(Bling, Tiny, Shopify) no formato deles, apagar produtos pela planilha.

Decisões da usuária (04/10):
- A planilha é montada pela lojista, a partir de um modelo baixado no próprio CRM.
- Fotos entram por link na planilha.
- Reimportar atualiza o produto existente, identificado pelo código.

Recomendação desta spec (a usuária não decidiu): **uma linha por combinação**. O
produto com variação ocupa várias linhas com o mesmo código, uma para cada combinação
(ex.: "P / Areia", "M / Areia"), cada uma com o seu estoque. É o formato que a lojista já
usa para controlar estoque e o mesmo da grade do catálogo.

## O formato da planilha

Uma linha de cabeçalho com estas colunas, nesta ordem. A importação reconhece as colunas
pelo nome do cabeçalho, sem diferenciar maiúscula, minúscula e acento.

| Coluna | Obrigatória | O que vai nela |
|---|---|---|
| Código | sim | Identifica o produto. Linhas com o mesmo código são o mesmo produto. É por ele que a reimportação acha o produto que já existe. |
| Nome | sim | Nome do produto (até 120 caracteres). |
| Preço | sim | Preço da peça, maior que zero. Aceita "89,90", "89.90" e "R$ 89,90". |
| Preço de | não | Preço riscado, maior que o preço. |
| Categoria | não | Nome da categoria. Se não existir no catálogo, é criada. Vazio = sem categoria. |
| Descrição | não | Texto livre. |
| Variação 1 | não | Nome do primeiro tipo de variação (ex.: Tamanho). |
| Opção 1 | não | A opção desta linha (ex.: P). |
| Variação 2 | não | Nome do segundo tipo (ex.: Cor). |
| Opção 2 | não | A opção desta linha (ex.: Areia). |
| Estoque | não | Peças desta combinação (ou do produto, se não tem variação). Vazio = 0. |
| Visível na loja | não | "sim" ou "não". Vazio = sim. |
| Fotos | não | Links das fotos, separados por espaço, vírgula ou ponto e vírgula, na ordem; a primeira é a principal. Até 8. |

Regras das linhas do mesmo produto:
- Nome, preço, preço de, categoria, descrição, visível e fotos valem pela **primeira linha**
  do produto; nas demais podem ficar vazios.
- Os nomes de Variação 1 e Variação 2 precisam ser iguais em todas as linhas do produto.
- Duas linhas do mesmo produto não podem ter a mesma combinação.
- Produto sem variação tem uma linha só.

## Páginas / Módulos

### Lista de produtos (`/catalogo`) — já existe

**Descrição:** Ganha o acesso à importação.

**Componentes:**
- **Botão "Importar planilha"**: ao lado de "Novo produto", na barra de ferramentas e no
  estado vazio do catálogo ("Cadastrar o primeiro produto" / "Importar planilha").

**Comportamentos:**
- **Abrir a importação**: tocar em "Importar planilha" abre a página de importação.

### Página de importação (`/catalogo/importar`)

**Descrição:** Guia a lojista em três passos — baixar o modelo, enviar o arquivo, conferir
e confirmar — e mostra o resultado.

**Componentes:**
- **Passo 1 — Modelo**: explica em uma frase como preencher e oferece o botão "Baixar
  modelo". Mostra um resumo das colunas obrigatórias (Código, Nome, Preço) e um link
  "Como preencher" que abre a explicação de cada coluna.
- **Modelo da planilha**: arquivo com o cabeçalho e 4 linhas de exemplo — um produto sem
  variação, um com uma variação (3 tamanhos) — preenchidos com dados de exemplo que deixam
  claro o formato (ex.: "VES-001", "Vestido Linho", "89,90"). Aba ou bloco de instruções
  com o que vai em cada coluna.
- **Explicação das colunas**: a tabela "O formato da planilha" acima, em linguagem da
  lojista, com um exemplo por coluna.
- **Passo 2 — Enviar**: área para escolher ou arrastar o arquivo. Aceita a planilha do
  Excel e o arquivo de texto separado por vírgula que o Google Planilhas exporta. Mostra
  os limites: até 1.000 linhas e 4 MB.
- **Passo 3 — Prévia**: aparece depois de enviar. Mostra:
  - o resumo: "38 produtos novos · 12 atualizados · 3 com erro";
  - a lista dos produtos, cada um com nome, código, quantas combinações, estoque total,
    quantas fotos, e o selo "Novo" ou "Atualiza";
  - para os produtos que atualizam, o que muda (ex.: "Preço 79,90 → 89,90",
    "Estoque 12 → 20");
  - os erros, por linha da planilha, em frase direta (ex.: "Linha 7: o preço 'oitenta'
    não é um número.", "Linhas 12 e 13: o produto VES-002 tem a combinação M / Areia
    repetida.").
- **Botão "Importar N produtos"**: importa só os produtos sem erro. Quando há erro, o texto
  ao lado diz "Os 3 produtos com erro ficam de fora. Corrija a planilha e envie de novo
  para incluí-los."
- **Botão "Enviar outro arquivo"**: volta ao passo 2.
- **Progresso**: enquanto importa, "Importando 23 de 50..." (as fotos demoram mais).
- **Resultado**: "50 produtos importados: 38 novos e 12 atualizados." com o aviso das
  fotos que não deu para baixar (ex.: "VES-004: a foto 2 não abriu (link quebrado)."), e
  os botões "Ver produtos" e "Importar outra planilha".

**Comportamentos:**
- **Baixar o modelo**: tocar em "Baixar modelo" baixa o arquivo do modelo.
- **Ver como preencher**: tocar em "Como preencher" mostra a explicação de cada coluna sem
  sair da página.
- **Escolher o arquivo**: tocar na área de envio abre o seletor de arquivos.
- **Arrastar o arquivo**: soltar o arquivo na área de envio no computador.
- **Arquivo de formato errado**: arquivo que não é planilha mostra "Envie a planilha do
  Excel ou o arquivo .csv do Google Planilhas." e nada é lido.
- **Arquivo grande demais**: acima de 4 MB ou de 1.000 linhas mostra o limite e nada é lido.
- **Planilha sem as colunas obrigatórias**: mostra quais colunas faltam (ex.: "Falta a
  coluna Preço. Use o modelo.") e não mostra prévia.
- **Planilha vazia**: mostra "A planilha não tem nenhum produto."
- **Ver a prévia**: depois de enviar, a lojista vê o que vai ser criado e atualizado
  **antes** de qualquer coisa ser gravada.
- **Ver os erros por linha**: cada erro aponta o número da linha da planilha e o que
  corrigir.
- **Ver o que muda num produto existente**: os produtos que atualizam mostram os campos
  que mudam, com o valor de antes e o de depois.
- **Confirmar a importação**: tocar em "Importar N produtos" grava os produtos sem erro.
- **Importação só com erros**: se nenhum produto está sem erro, o botão fica travado com
  "Nenhum produto pode ser importado. Corrija a planilha."
- **Enviar outro arquivo**: descarta a prévia e volta ao envio.
- **Ver o resultado**: ao terminar, vê quantos foram criados e atualizados e os avisos das
  fotos.
- **Ir para os produtos**: tocar em "Ver produtos" abre a lista de produtos.
- **Sair no meio**: sair da página durante a prévia não grava nada.

### Regras da importação (o que acontece ao confirmar)

**Descrição:** O que a importação faz com cada produto da planilha.

**Comportamentos:**
- **Produto novo**: código que não existe no catálogo cria um produto, com as variações,
  o estoque de cada combinação, a categoria, a visibilidade e as fotos.
- **Produto existente**: código que já existe atualiza o produto: nome, preço, preço de,
  categoria, descrição, visibilidade e o estoque das combinações da planilha.
- **Campo vazio na atualização**: coluna opcional vazia na planilha **não apaga** o que o
  produto já tem (ex.: Descrição vazia mantém a descrição atual). Preço de vazio mantém o
  atual.
- **Combinação nova na atualização**: combinação que o produto ainda não tem é acrescentada,
  com o estoque da planilha.
- **Combinação que não está na planilha**: o produto mantém a combinação e o estoque que
  já tinha (a planilha não apaga nada).
- **Variações diferentes na atualização**: se a planilha muda os nomes das variações de um
  produto existente (ex.: o produto tem Tamanho e a planilha traz Cor), o produto entra
  na lista de erros: "VES-001: as variações não batem com as do produto (Tamanho). Edite
  o produto no CRM."
- **Fotos na criação**: as fotos dos links são baixadas e guardadas no catálogo, na ordem
  da planilha. Link que não abre, que não é imagem ou que passa de 5 MB vira aviso no
  resultado; o produto é importado sem aquela foto.
- **Fotos na atualização**: coluna Fotos preenchida **substitui** as fotos do produto;
  vazia mantém as fotos atuais.
- **Categoria nova**: nome de categoria que não existe cria a categoria (uma vez só, mesmo
  que vários produtos a usem). Nomes iguais sem diferenciar maiúscula e acento são a mesma
  categoria.
- **Posição na lista**: produtos novos entram no fim da sua categoria, na ordem da planilha.
- **Código repetido no catálogo**: se o catálogo já tem dois produtos com o mesmo código, o
  produto da planilha entra na lista de erros: "VES-001: há 2 produtos com esse código no
  catálogo. Dê códigos diferentes a eles no CRM."
- **Tudo ou nada por produto**: cada produto é gravado inteiro (dados, combinações e
  estoque) ou não é gravado; nunca fica pela metade.
- **Quem pode**: só Admin e Gerente importam; o Atendente não vê o botão nem abre a página.
- **Isolamento**: a importação só lê e grava produtos e categorias da própria empresa.
- **Pedidos não mudam**: atualizar preço ou estoque não altera pedidos já feitos.
- **A loja reflete na hora**: produtos importados visíveis aparecem na vitrine assim que a
  importação termina.
