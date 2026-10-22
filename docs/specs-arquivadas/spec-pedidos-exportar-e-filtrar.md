# Spec: Pedidos do catálogo — filtros novos, período personalizado e exportação

> série: B39
> estado: aprovada em 22/10/2026

## Visão Geral

A tela **Pedidos** (`/catalogo/pedidos`, item "Pedidos" do menu) lista os pedidos que as
clientes fazem pela loja do catálogo. Hoje ela filtra por nome/WhatsApp, situação e
período (só os atalhos Hoje, 7 dias, 30 dias e Tudo), e os filtros olham apenas os 500
pedidos mais recentes, que a tela já carregou.

Esta mudança:

- acrescenta quatro filtros: **valor do pedido**, **produto no pedido**, **cliente nova ou
  antiga** e **atendente da cliente**;
- acrescenta o período **Personalizado**, com calendário de/até, mantendo os atalhos;
- faz os filtros valerem para **todos os pedidos** da empresa, não só os 500 mais recentes;
- permite **exportar** em Excel (abas "Pedidos" e "Itens") e em CSV, escolhendo na hora
  entre os pedidos filtrados e todos os pedidos.

Vale para todos os papéis: quem vê os pedidos também filtra e exporta. A tela segue o
estilo Caderno da série B36.

## Páginas / Módulos

### Pedidos — filtros e período

**Descrição:** a barra de filtros acima da lista de pedidos ganha os filtros novos e o
período personalizado. A lista e a contagem passam a vir do servidor, sobre todos os pedidos.

**Componentes:**
- Busca por nome ou WhatsApp (já existe).
- Situação (já existe).
- Período: Hoje, Últimos 7 dias, Últimos 30 dias, Tudo e Personalizado.
- Calendário de/até: aparece quando o período é Personalizado.
- Valor do pedido: mínimo e máximo em R$ (os dois opcionais).
- Produto no pedido: escolha de um produto do catálogo, incluindo os já apagados que aparecem em pedidos antigos.
- Cliente: Todas, Nova (primeira compra) ou Antiga (já tinha comprado).
- Atendente da cliente: Todos, um atendente da empresa, ou Sem atendente.
- Contagem: "N pedidos".
- Ação "Limpar filtros".

**Comportamentos:**
- Escolher um atalho de período.
- Escolher "Personalizado" e marcar o dia inicial e o dia final no calendário.
- Informar o valor mínimo, o máximo, ou os dois.
- Escolher um produto.
- Escolher Cliente nova ou Cliente antiga.
- Escolher um atendente, ou "Sem atendente".
- Combinar qualquer um dos filtros com os outros (todos valem juntos).
- Limpar todos os filtros de uma vez.

**Critérios de aceite:**

#### CA-B39-01 — Período personalizado pelo calendário · prova: automática

- **Dado** pedidos feitos em 01/10, 10/10 e 20/10
- **Quando** a pessoa escolhe "Personalizado" e marca de 05/10 até 15/10
- **Então** só aparece o pedido de 10/10; os dias de início e fim contam inteiros, no horário de Brasília

#### CA-B39-02 — Dia final antes do inicial é recusado · prova: automática

- **Dado** o período Personalizado aberto
- **Quando** a pessoa marca o dia final antes do dia inicial
- **Então** a tela avisa "O dia final precisa ser depois do inicial" e a lista não muda

#### CA-B39-03 — Os atalhos de período continuam · prova: automática

- **Dado** pedidos de hoje, de 5 dias atrás e de 20 dias atrás
- **Quando** a pessoa escolhe "Hoje", depois "Últimos 7 dias"
- **Então** aparece só o de hoje, e depois o de hoje e o de 5 dias atrás

#### CA-B39-04 — Filtrar pelo valor do pedido · prova: automática

- **Dado** pedidos de R$ 300, R$ 800 e R$ 1.500
- **Quando** a pessoa informa mínimo R$ 500, depois máximo R$ 1.000 junto
- **Então** aparecem primeiro os de R$ 800 e R$ 1.500, e depois só o de R$ 800 (o valor é o que a cliente paga, já com desconto)

#### CA-B39-05 — Filtrar pelo produto no pedido · prova: automática

- **Dado** um pedido com a "Blusa Lisa" e outro sem ela
- **Quando** a pessoa escolhe o produto "Blusa Lisa"
- **Então** só aparece o pedido que tem a Blusa Lisa

#### CA-B39-19 — Produto apagado do catálogo continua no filtro · prova: automática

- **Dado** um pedido antigo com a "Saia Antiga", produto que já foi apagado do catálogo
- **Quando** a pessoa abre a escolha de produto e escolhe "Saia Antiga"
- **Então** o produto aparece na lista (marcado como apagado) e o pedido antigo aparece no resultado

#### CA-B39-06 — Filtrar cliente nova ou antiga · prova: automática

- **Dado** uma cliente que já tinha compra antes do pedido e outra que nunca tinha comprado
- **Quando** a pessoa escolhe "Nova", depois "Antiga"
- **Então** "Nova" mostra só o pedido da que nunca tinha comprado; "Antiga", só o da que já tinha

#### CA-B39-07 — Filtrar pelo atendente da cliente · prova: automática

- **Dado** uma cliente da carteira da Ana, outra da carteira do Bruno e outra sem atendente
- **Quando** a pessoa escolhe "Ana", depois "Sem atendente"
- **Então** aparece só o pedido da cliente da Ana, e depois só o da cliente sem atendente

#### CA-B39-08 — Os filtros valem juntos · prova: automática

- **Dado** pedidos variados
- **Quando** a pessoa combina situação "Fechado", mínimo R$ 500 e cliente "Nova"
- **Então** só aparecem os pedidos fechados, de R$ 500 ou mais, de clientes novas

#### CA-B39-09 — Os filtros olham todos os pedidos · prova: automática

- **Dado** uma empresa com mais de 500 pedidos, e o pedido procurado é o mais antigo
- **Quando** a pessoa filtra por um valor que só ele tem
- **Então** ele aparece, e a contagem mostra "1 pedido"

#### CA-B39-10 — Limpar filtros volta ao padrão · prova: automática

- **Dado** vários filtros ligados
- **Quando** a pessoa clica em "Limpar filtros"
- **Então** todos voltam ao padrão (situação Todas, período Últimos 30 dias, campos vazios) e a lista mostra os pedidos desse padrão

#### CA-B39-11 — Filtros cabem no celular · prova: manual

- **Dado** a tela Pedidos aberta no celular
- **Quando** a pessoa abre o período Personalizado e preenche os filtros novos
- **Então** tudo cabe sem rolar para o lado, o calendário abre e fecha bem, e o visual segue o estilo Caderno

### Pedidos — exportar

**Descrição:** um botão "Exportar" na tela Pedidos baixa os pedidos em Excel ou CSV. Na
hora de exportar, a pessoa escolhe entre os pedidos filtrados e todos os pedidos.

**Componentes:**
- Botão "Exportar".
- Escolha do que exportar: "Só os filtrados (N pedidos)" ou "Todos os pedidos".
- Escolha do formato: Excel; CSV de pedidos; CSV de itens.

**Comportamentos:**
- Abrir as opções de exportação.
- Escolher entre os filtrados e todos.
- Baixar em Excel.
- Baixar o CSV de pedidos.
- Baixar o CSV de itens.

**Critérios de aceite:**

#### CA-B39-12 — Excel com as abas Pedidos e Itens · prova: automática

- **Dado** dois pedidos, um com 2 produtos e outro com 1
- **Quando** a pessoa exporta em Excel
- **Então** o arquivo tem a aba "Pedidos" com 2 linhas (número, data, cliente, WhatsApp, peças, desconto, total, situação) e a aba "Itens" com 3 linhas (número do pedido, data, cliente, produto, variação, quantidade, preço unitário, subtotal); datas como data e valores como número

#### CA-B39-13 — Exportar só os filtrados · prova: automática

- **Dado** 3 pedidos, 1 deles fechado, e o filtro situação "Fechado" ligado
- **Quando** a pessoa escolhe "Só os filtrados" e exporta
- **Então** o arquivo traz só o pedido fechado (e só os itens dele)

#### CA-B39-14 — Exportar todos os pedidos · prova: automática

- **Dado** os mesmos 3 pedidos e o filtro "Fechado" ligado
- **Quando** a pessoa escolhe "Todos os pedidos" e exporta
- **Então** o arquivo traz os 3 pedidos, sem perder o filtro da tela

#### CA-B39-15 — CSV que abre certo no Excel em português · prova: automática

- **Dado** um pedido de R$ 1.234,50 da cliente "Conceição"
- **Quando** a pessoa baixa o CSV de pedidos
- **Então** as colunas vêm separadas por ponto e vírgula, o valor aparece como 1234,50, a data como dd/mm/aaaa e o nome com acento certo

#### CA-B39-16 — CSV de itens · prova: automática

- **Dado** os dois pedidos do critério do Excel
- **Quando** a pessoa baixa o CSV de itens
- **Então** o arquivo tem 3 linhas de itens, com as mesmas colunas da aba "Itens"

#### CA-B39-17 — Todos os papéis exportam, só da própria empresa · prova: automática

- **Dado** um Atendente da empresa A e pedidos nas empresas A e B
- **Quando** o Atendente exporta "Todos os pedidos"
- **Então** o arquivo traz os pedidos da empresa A e nenhum da empresa B

#### CA-B39-18 — Nome do arquivo diz o que é · prova: automática

- **Dado** o período Personalizado de 05/10/2026 a 15/10/2026
- **Quando** a pessoa exporta os filtrados em Excel
- **Então** o arquivo se chama `pedidos-2026-10-05-a-2026-10-15.xlsx`; exportando todos, `pedidos-todos.xlsx`; os CSV seguem o mesmo nome com `-itens` quando for de itens

## Fora de escopo

- Exportar o detalhe de um pedido só (a tela de detalhe continua igual).
- Mudar a situação de vários pedidos de uma vez.
- Filtros salvos na tela Pedidos.
- Enviar a planilha por e-mail ou WhatsApp.
- Mudar a loja pública do catálogo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B39-01 | O padrão da tela continua "Últimos 30 dias" e situação "Todas", como hoje. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-02 | "Atendente da cliente" é o atendente do contato da cliente (a carteira da série B35), não quem mexeu no pedido. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-03 | O produto do filtro é escolhido entre os produtos que existem hoje no catálogo; pedido de produto já apagado do catálogo não aparece nesse filtro. | invalidada | A lista do filtro também traz os produtos apagados que aparecem em pedidos antigos (CA-B39-19). Marcelle, 22/10/2026. |
| SUP-B39-04 | Pedido sem contato ligado (cliente que ainda não virou contato) conta como cliente nova e como "Sem atendente". | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B39-01 | Quais filtros novos entram? | respondida | Valor do pedido, produto no pedido, cliente nova ou antiga e atendente da cliente. Marcelle, 22/10/2026. |
| PER-B39-02 | O que vai em cada linha da planilha? | respondida | As duas: aba "Pedidos" (uma linha por pedido) e aba "Itens" (uma linha por produto); no CSV, a pessoa escolhe qual baixar. Marcelle, 22/10/2026. |
| PER-B39-03 | A exportação leva só os filtrados ou todos? | respondida | A pessoa escolhe na hora de exportar. Marcelle, 22/10/2026. |
| PER-B39-04 | Quem pode exportar? | respondida | Todos os papéis. Marcelle, 22/10/2026. |
| PER-B39-05 | O que é "cliente nova"? | respondida | Antes deste pedido ela não tinha nenhum pedido fechado nem compra registrada; "antiga" já tinha. Marcelle, 22/10/2026. |
| PER-B39-06 | Como fica o período? | respondida | Continuam os atalhos (Hoje, 7 dias, 30 dias, Tudo) e entra "Personalizado" com calendário de/até. Marcelle, 22/10/2026. |
| PER-B39-07 | Em que formato vai o CSV? | respondida | Para o Excel em português: ponto e vírgula entre colunas e vírgula decimal. Marcelle, 22/10/2026. |
