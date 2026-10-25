# Spec: Fundação da venda

> série: B30
> estado: aprovada em 20/10/2026

## Visão Geral

Os relatórios de análise que vêm a seguir (Visão Geral ampliada, Coorte, Funil de
clientes, RFV e Carteiras, no modelo dos prints do Tailor CRM levantados em 20/10/2026)
nascem todos de um único dado: a venda. Hoje a venda existe em dois lugares do CRM que
não conversam:

- a **compra do contato**, registrada à mão no perfil, só com data e valor, e única
  fonte do dashboard e da performance por vendedor;
- o **pedido do catálogo**, com total, peças, itens e situação, que ao ser fechado não
  vira compra de ninguém e não entra em métrica nenhuma.

Esta mudança une as duas coisas numa fonte só e dá à compra os campos que os relatórios
precisam. Para Admin e Gerente, que acompanham números; para o Atendente, que fecha
pedidos e vê o histórico do cliente. Resolve o problema de o dashboard ignorar tudo o
que foi vendido pela loja e de a compra manual não dizer quem vendeu, quantas peças,
nem como foi pago.

Ela também fixa o padrão de gráfico e de exportação em Excel que as telas seguintes vão
repetir, provando cada um num lugar pequeno.

Decisões tomadas pela Marcelle em 20/10/2026, na conversa que originou esta spec:

- a venda feita pelo catálogo fica com **quem fechou o pedido** como atendente;
- as formas de pagamento são uma **lista fixa** do sistema;
- a compra já nasce **preparada para um sistema externo** (ERP), guardando origem e
  código externo, mesmo sem integração ainda;
- a exportação em Excel aparece primeiro nas **compras do contato**.

## Páginas / Módulos

### Pedido do catálogo que vira compra

**Descrição:** o pedido feito pela loja do catálogo passa a alimentar o histórico de
compras do contato sozinho, acompanhando a situação do pedido.

**Componentes:**
- Situação do pedido (Novo, Em atendimento, Fechado, Cancelado): já existe; é o gatilho.
- Compra do contato: ganha um vínculo com o pedido que a originou.

**Comportamentos:**
- Marcar um pedido como Fechado cria uma compra no contato vinculado ao pedido.
- Voltar um pedido Fechado para Em atendimento remove a compra que ele gerou.
- Cancelar um pedido Fechado remove a compra que ele gerou.
- Fechar de novo um pedido que já foi reaberto cria a compra de novo.
- Fechar um pedido sem contato vinculado não cria compra e não impede o fechamento.
- Pedidos que já estavam Fechados antes desta mudança ganham a compra deles, uma vez só.

**Critérios de aceite:**

#### CA-B30-01 — Fechar o pedido registra a compra no contato · prova: automática

- **Dado** um pedido do catálogo vinculado a um contato, em Novo ou Em atendimento, com total de R$ 350,00 e 7 peças
- **Quando** o vendedor marca o pedido como Fechado
- **Então** o contato ganha uma compra com a data do fechamento, valor R$ 350,00, 7 peças, origem "Catálogo", o número do pedido e o atendente igual a quem fechou

#### CA-B30-02 — Reabrir ou cancelar o pedido desfaz a compra · prova: automática

- **Dado** um pedido Fechado cuja compra já aparece no contato
- **Quando** o vendedor volta o pedido para Em atendimento, ou o cancela
- **Então** a compra some do histórico do contato e deixa de contar no dashboard

#### CA-B30-03 — Fechar de novo cria a compra de novo, sem duplicar · prova: automática

- **Dado** um pedido que foi fechado, reaberto e fechado outra vez
- **Quando** o vendedor olha o histórico de compras do contato
- **Então** existe exatamente uma compra ligada a esse pedido

#### CA-B30-04 — Pedido sem contato fecha sem gerar compra · prova: automática

- **Dado** um pedido do catálogo sem contato vinculado
- **Quando** o vendedor marca o pedido como Fechado
- **Então** o pedido fica Fechado e nenhuma compra é criada

#### CA-B30-21 — Pedidos fechados antes da mudança ganham compra · prova: automática

- **Dado** um pedido do catálogo que já estava Fechado antes desta série, vinculado a um contato, e que ainda não tem compra
- **Quando** a mudança entra no ar
- **Então** o contato ganha uma compra com a data em que o pedido foi marcado como Fechado (do histórico do pedido), o valor e as peças do pedido, origem "Catálogo" e sem atendente; rodar de novo não cria uma segunda compra

#### CA-B30-05 — Compra do catálogo não se apaga nem se edita à mão · prova: automática

- **Dado** uma compra com origem "Catálogo"
- **Quando** alguém tenta alterá-la ou removê-la por fora do pedido
- **Então** a operação é recusada; o jeito de desfazer é reabrir ou cancelar o pedido

### Compra do contato com os campos dos relatórios

**Descrição:** a compra deixa de ser só data e valor e passa a guardar o que os
relatórios futuros precisam.

**Componentes:**
- Data e valor: já existem, continuam obrigatórios. O valor é o que o cliente pagou.
- Quantidade de peças: número inteiro, opcional.
- Desconto: valor em reais, opcional, só informativo (não altera o valor pago).
- Forma de pagamento: uma de uma lista fixa (Pix, Boleto, Cartão de crédito, Cartão de débito, Transferência, Dinheiro, Cheque, Outro), opcional.
- Atendente responsável pela venda: um usuário ativo da empresa, opcional.
- Origem: "Manual", "Catálogo" ou "Externa". A origem "Externa" fica reservada para uma
  integração futura e nenhuma tela desta série a cria.
- Código externo: identificador do pedido num sistema de fora. Fica guardado junto com a
  origem "Externa"; nenhuma tela desta série o mostra ou edita.

**Comportamentos:**
- Registrar uma compra manual com só data e valor continua funcionando.
- Registrar uma compra manual informando peças, desconto, forma de pagamento e atendente.
- O atendente vem pré-preenchido no diálogo com o atendente do contato; sem atendente no contato, com quem está registrando.
- Quantidade de peças negativa ou quebrada, e desconto negativo, são recusados.
- A compra manual mantém a regra de hoje: Admin e Gerente registram; Atendente não.

**Critérios de aceite:**

#### CA-B30-06 — Compra manual só com data e valor continua valendo · prova: automática

- **Dado** o diálogo de registrar compra no perfil do contato
- **Quando** o usuário preenche só data e valor e salva
- **Então** a compra aparece no histórico com origem "Manual" e os demais campos vazios

#### CA-B30-07 — Compra manual com todos os campos · prova: automática

- **Dado** o diálogo de registrar compra
- **Quando** o usuário preenche data, valor, 12 peças, desconto R$ 30,00, forma "Pix" e escolhe um atendente, e salva
- **Então** a compra aparece no histórico com esses valores e o valor pago continua o digitado, sem o desconto ser subtraído de novo

#### CA-B30-08 — Atendente vem sugerido no diálogo · prova: automática

- **Dado** um contato com atendente responsável definido
- **Quando** o usuário abre o diálogo de registrar compra
- **Então** o campo de atendente já vem com o atendente do contato; num contato sem atendente, vem com quem está registrando

#### CA-B30-09 — Peças e desconto inválidos são recusados · prova: automática

- **Dado** o diálogo de registrar compra
- **Quando** o usuário informa peças "2,5" ou "-1", ou desconto "-10", e tenta salvar
- **Então** a tela aponta o campo errado e a compra não é criada

#### CA-B30-10 — Atendente continua sem registrar compra manual · prova: automática

- **Dado** um usuário com papel Atendente
- **Quando** ele tenta registrar uma compra manual
- **Então** a operação é recusada com o aviso de falta de permissão (regra que já existe)

### Histórico de compras no perfil do contato

**Descrição:** a tabela de compras do perfil mostra a fonte unificada e ganha a
exportação em Excel que vai servir de padrão para as telas seguintes.

**Componentes:**
- Tabela de compras: data, valor, peças, forma de pagamento, atendente e origem. Na
  origem "Catálogo", o número do pedido leva ao pedido.
- Total em compras e ticket médio: já existem; passam a incluir as compras do catálogo.
- Botão "Exportar": baixa uma planilha Excel com as mesmas colunas da tabela, uma linha
  por compra, na ordem da tela.
- Timeline do contato: a compra do catálogo aparece uma vez, como evento "Compra", citando
  o número do pedido. O evento "Pedido do catálogo" continua marcando quando o pedido chegou.

**Comportamentos:**
- Ver a compra vinda do catálogo lado a lado com a manual, diferenciadas pela origem.
- Clicar no número do pedido numa compra de origem "Catálogo" e abrir o pedido.
- Exportar o histórico de compras do contato para Excel.
- Exportar um contato sem compras gera a planilha só com o cabeçalho.
- Atendente só exporta compras de contatos que ele pode ver (regra de visibilidade que já existe).

**Critérios de aceite:**

#### CA-B30-11 — Histórico mostra as duas origens com as colunas novas · prova: automática

- **Dado** um contato com uma compra manual (Pix, 3 peças) e um pedido do catálogo fechado
- **Quando** o usuário abre o perfil do contato
- **Então** a tabela lista as duas compras, com peças, forma de pagamento, atendente e origem, e o total em compras soma as duas

#### CA-B30-12 — Número do pedido leva ao pedido · prova: automática

- **Dado** uma compra de origem "Catálogo" no histórico
- **Quando** o usuário clica no número do pedido
- **Então** abre o detalhe daquele pedido do catálogo

#### CA-B30-13 — Exportar baixa a planilha com as compras · prova: automática

- **Dado** um contato com três compras no histórico
- **Quando** o usuário clica em "Exportar"
- **Então** baixa um arquivo Excel com cabeçalho (Data, Valor, Peças, Desconto, Forma de pagamento, Atendente, Origem, Pedido) e três linhas, na mesma ordem da tela

#### CA-B30-14 — Exportar sem compras gera só o cabeçalho · prova: automática

- **Dado** um contato sem compras
- **Quando** o usuário clica em "Exportar"
- **Então** baixa um arquivo Excel só com o cabeçalho, sem erro

#### CA-B30-15 — Compra do catálogo aparece uma vez na timeline · prova: automática

- **Dado** um pedido do catálogo que foi fechado
- **Quando** o usuário olha a timeline do contato
- **Então** há um evento "Compra" com o número do pedido e um evento "Pedido do catálogo" da chegada do pedido; a compra não aparece duas vezes

### Dashboard e performance por vendedor na fonte unificada

**Descrição:** as métricas que hoje só olham a compra manual passam a olhar todas as
compras, e o vendedor passa a ser o da venda quando ela tem um.

**Componentes:**
- Cards de receita do dashboard (total de compras, quantidade, ticket médio geral, ticket
  de primeira compra, faturamento de clientes novos): já existem.
- Tabela de performance por vendedor (recompras e ticket médio): já existe.

**Comportamentos:**
- O dashboard conta a compra vinda do catálogo igual à manual.
- O dashboard deixa de contar a compra cujo pedido foi reaberto ou cancelado.
- A compra com atendente definido conta para esse atendente na performance.
- A compra sem atendente segue a regra de hoje: conta para o atendente do contato no funil.
- O filtro por atendente do dashboard usa a mesma regra.

**Critérios de aceite:**

#### CA-B30-16 — Dashboard soma a compra do catálogo · prova: automática

- **Dado** um período com uma compra manual de R$ 100,00 e um pedido do catálogo fechado de R$ 250,00
- **Quando** Admin abre o dashboard nesse período
- **Então** "Total de compras" mostra R$ 350,00 e a quantidade mostra 2

#### CA-B30-17 — Performance usa o atendente da venda · prova: automática

- **Dado** um contato cujo card do funil está com a atendente Ana e uma compra registrada com o atendente Bruno
- **Quando** Admin abre a performance por vendedor
- **Então** o ticket médio de Bruno inclui essa compra e o de Ana não

#### CA-B30-18 — Compra sem atendente segue a regra de hoje · prova: automática

- **Dado** uma compra manual antiga, sem atendente, de um contato cujo card está com a atendente Ana
- **Quando** Admin abre a performance por vendedor
- **Então** a compra conta para Ana

### Padrão de gráfico para os relatórios

**Descrição:** fixa a biblioteca de gráficos que as telas seguintes vão usar, provando
no dashboard que ela funciona no tema escuro do CRM. Os gráficos de hoje são desenhos
próprios, sem interação.

**Componentes:**
- Gráfico de distribuição da base (donut do dashboard): passa a ser desenhado pela
  biblioteca escolhida, com legenda e valor ao passar o mouse.
- Gráfico de funil de etapas do dashboard: idem.

**Comportamentos:**
- Passar o mouse numa fatia ou barra mostra o nome e o valor.
- Os números exibidos não mudam em relação a hoje.

**Critérios de aceite:**

#### CA-B30-19 — Gráficos do dashboard com interação e sem mudar os números · prova: manual

- **Dado** o dashboard com dados
- **Quando** a Marcelle passa o mouse nas fatias do donut e nas barras do funil
- **Então** aparece o nome e o valor de cada parte; os totais são os mesmos de antes; o gráfico é legível no tema escuro, sem texto branco em fundo branco

#### CA-B30-20 — Dados do gráfico continuam iguais · prova: automática

- **Dado** o mesmo conjunto de cards e compras
- **Quando** o dashboard calcula a distribuição da base e o funil de etapas
- **Então** os valores entregues ao gráfico são os mesmos que a versão anterior entregava

## Fora de escopo

- As telas de relatório em si: Visão Geral ampliada (comparativos, vendas diárias, projeção, 25 meses), Coorte, Funil de clientes, RFV e Carteiras. Cada uma vira série própria sobre esta fundação.
- Integração real com ERP. Esta série só deixa a compra preparada (origem "Externa" e código externo).
- Formas de pagamento cadastradas pela empresa. A lista é fixa; abrir depois é mudança pequena.
- Editar ou excluir uma compra manual já registrada. Hoje não existe e continua não existindo.
- Desconto, forma de pagamento ou atendente no pedido do catálogo em si. O pedido continua como está; esses campos ficam vazios na compra que ele gera.
- Decisões das séries seguintes, anotadas aqui para não se perderem: se o perfil RFV substitui a classificação por etapa do funil de Recompra; qual o limiar de dias para "cliente parado"; se a carteira do vendedor é o atendente do contato.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B30-01 | O valor da compra é o que o cliente pagou (líquido). O desconto é só informativo e nunca é subtraído do valor. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-02 | A data da compra gerada pelo catálogo é o dia em que o pedido foi marcado como Fechado, não o dia em que o pedido chegou. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-03 | Pedido sem contato vinculado fecha normalmente e não gera compra. Vincular o contato depois não cria a compra retroativamente. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-04 | Compra de origem "Catálogo" não pode ser editada nem apagada à mão; só reabrir ou cancelar o pedido a desfaz. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-05 | No diálogo de compra manual, o atendente vem sugerido como o atendente do contato e, sem ele, como quem está registrando. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-06 | Na timeline, a compra do catálogo aparece uma vez, como "Compra" com o número do pedido; o evento "Pedido do catálogo" continua marcando a chegada do pedido. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-07 | Na performance por vendedor, compra com atendente conta para ele; compra sem atendente segue a regra atual (atendente do card do contato). | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-08 | Um Atendente que fecha um pedido do catálogo gera a compra normalmente, mesmo não podendo registrar compra manual. | confirmada | Marcelle, 20/10/2026 |
| SUP-B30-09 | A exportação em Excel abre no Excel e no Google Planilhas, com datas e valores reconhecidos como data e número, não como texto. | confirmada | Marcelle, 20/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B30-01 | Pedidos do catálogo que já estavam Fechados antes desta mudança viram compra do contato? Se sim, com a data de fechamento registrada no histórico do pedido e sem atendente, já que não dá para saber quem fechou na época. | respondida | Sim. Viram compra com a data de fechamento do histórico do pedido e sem atendente. Marcelle, 20/10/2026 |
| PER-B30-02 | A lista fixa de formas de pagamento é: Pix, Boleto, Cartão de crédito, Cartão de débito, Transferência, Dinheiro, Cheque, Outro? Falta ou sobra alguma? | respondida | Sim, exatamente essa lista, sem parcelas. Marcelle, 20/10/2026 |
