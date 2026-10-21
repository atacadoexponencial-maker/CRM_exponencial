# Spec: Relatórios — Visão Geral

> série: B32
> estado: aprovada em 21/10/2026

## Visão Geral

O CRM ganha uma tela **Relatórios**, no menu logo abaixo do Dashboard, que vai abrigar
os relatórios de análise no modelo do Tailor CRM (prints de 03/09/2026, levantados em
20/10/2026). Esta série entrega a primeira aba, **Visão Geral**: a leitura mensal da
venda, com comparativos, vendas por dia, projeção do mês, formas de pagamento, variação
por cidade e a evolução dos últimos 25 meses. As demais abas (RFV, Coorte, Funil de
clientes, Carteiras) vêm em séries próprias.

Tudo nasce da fonte única da venda criada na B30: a compra do contato, com data, valor
pago, desconto, peças, forma de pagamento, atendente e origem. Nada de novo precisa ser
registrado; o relatório só lê o que já existe.

É para o Admin e o Gerente, que acompanham o negócio, e para o Atendente, que vê só o
que ele vendeu. Resolve o problema de o Dashboard mostrar um recorte pequeno (total,
ticket, faturamento de novos) sem comparar com o passado nem dizer como a venda se
distribui no mês.

A série também corrige um defeito do Dashboard encontrado em 21/10/2026: a compra
registrada hoje só entra nos números a partir do meio-dia.

Decisões da Marcelle em 21/10/2026, na conversa que originou esta spec:

- todos os papéis veem a tela; o Atendente só com os próprios números, como no Dashboard;
- a correção da compra de hoje no Dashboard entra nesta série;
- o período padrão ao abrir é o mês atual, do dia 1º até hoje;
- o contato ganha o campo **UF**, para a variação por estado ser como no Tailor;
- a tela já mostra as abas futuras (RFV, Coorte, Funil de clientes, Carteiras) desativadas, com "em breve".

### Vocabulário do relatório (como cada número é calculado)

| Termo | Significado no CRM |
|---|---|
| Venda | Uma compra do contato, de qualquer origem (manual, catálogo, externa) |
| Faturamento líquido | Soma do valor pago das vendas |
| Descontos | Soma dos descontos informados nas vendas (vazio conta como zero) |
| Faturamento bruto | Faturamento líquido + descontos |
| Clientes positivados | Quantidade de contatos distintos com ao menos uma venda no período |
| Peças | Soma das peças informadas nas vendas (vazio conta como zero) |
| Ticket médio por cliente | Faturamento líquido ÷ clientes positivados |
| Ticket médio por venda | Faturamento líquido ÷ quantidade de vendas |
| Ticket médio por peça | Faturamento líquido ÷ peças |
| Peças por cliente | Peças ÷ clientes positivados |
| Comparação justa | Quando o período inclui o mês atual, o comparativo usa só até o dia anterior (D-1) nos dois lados, para não comparar um mês inteiro com um mês pela metade |

Toda divisão por zero mostra "—", nunca zero nem erro.

## Páginas / Módulos

### Tela Relatórios e aba Visão Geral

**Descrição:** rota `/relatorios`, item "Relatórios" no menu abaixo de "Dashboard". A
tela tem abas: Visão Geral (esta série) ativa, e RFV, Coorte, Funil de clientes e
Carteiras desativadas, marcadas "em breve", sem levar a lugar nenhum.

**Componentes:**
- Item "Relatórios" no menu lateral e na barra do celular, para todos os papéis.
- Cabeçalho da aba com o período em uso ("Mês: Outubro | Ano: 2026") e o aviso de
  comparação justa quando o mês atual está incluído ("Comparativos até o dia 20 para
  comparar períodos iguais").
- Atalhos de período: **Ontem**, **Mês anterior**, **Este mês**.
- Filtros: mês/ano (um mês ou vários meses do mesmo ano) e atendente (Admin e Gerente).
- Esqueleto de carregamento enquanto os números chegam, como nas outras telas.

**Comportamentos:**
- Abrir a tela mostra a Visão Geral do mês atual, de 1º até hoje.
- Clicar em "Ontem" mostra só o dia de ontem.
- Clicar em "Mês anterior" mostra o mês passado inteiro.
- Clicar em "Este mês" volta ao padrão.
- Escolher vários meses do mesmo ano soma o período e esconde os comparativos (como no
  Tailor, que só compara um mês por vez).
- Escolher um atendente limita todos os blocos às vendas dele (regra da B30-03: venda com
  atendente é dele; sem atendente, é do atendente do card do contato).
- O Atendente abre a tela já filtrada por ele mesmo, sem o filtro de atendente.

**Critérios de aceite:**

#### CA-B32-01 — Relatórios aparece no menu para todos os papéis · prova: automática

- **Dado** um usuário Admin, Gerente ou Atendente logado
- **Quando** ele olha o menu lateral
- **Então** há o item "Relatórios" logo abaixo de "Dashboard", e ele leva a `/relatorios`

#### CA-B32-24 — Abas futuras aparecem desativadas · prova: automática

- **Dado** a tela Relatórios aberta
- **Quando** o usuário olha as abas
- **Então** "Visão Geral" está ativa e "RFV", "Coorte", "Funil de clientes" e "Carteiras" aparecem desativadas com "em breve", e clicar nelas não muda a tela

#### CA-B32-02 — Abrir a tela mostra o mês atual até hoje · prova: automática

- **Dado** vendas registradas neste mês e no mês passado
- **Quando** o usuário abre `/relatorios`
- **Então** o cabeçalho diz o mês e o ano atuais e os números só contam as vendas de 1º do mês até hoje

#### CA-B32-03 — Atalhos Ontem, Mês anterior e Este mês · prova: automática

- **Dado** a tela aberta
- **Quando** o usuário clica em "Ontem", "Mês anterior" ou "Este mês"
- **Então** o cabeçalho e os números passam a refletir, respectivamente, só o dia de ontem, o mês passado inteiro e o mês atual até hoje

#### CA-B32-04 — Vários meses somam e escondem os comparativos · prova: automática

- **Dado** a tela aberta
- **Quando** o usuário escolhe Janeiro a Março do ano atual
- **Então** os cartões mostram a soma dos três meses e nenhum cartão exibe "vs mês passado" ou "vs ano passado"

#### CA-B32-05 — Atendente vê só as vendas dele · prova: automática

- **Dado** vendas de dois atendentes no mês
- **Quando** um deles, com papel Atendente, abre `/relatorios`
- **Então** todos os blocos contam só as vendas dele e não há filtro de atendente na tela

#### CA-B32-06 — Filtro de atendente para Admin e Gerente · prova: automática

- **Dado** vendas de dois atendentes no mês
- **Quando** o Admin escolhe um deles no filtro
- **Então** todos os blocos passam a contar só as vendas daquele atendente

### Cartões de resumo com comparativos

**Descrição:** dez cartões no topo, em duas linhas, cada um com o valor do período e,
quando o período é um único mês, duas linhas de comparativo: "vs mês passado" e "vs ano
passado", em verde quando sobe e vermelho quando cai.

**Componentes:**
- Linha 1: Clientes positivados, Qtd de vendas, Faturamento bruto, Descontos, Faturamento líquido.
- Linha 2: Ticket médio por cliente, Ticket médio por venda, Ticket médio por peça, Peças por cliente, Qtd de peças.
- Cada comparativo: variação percentual contra o mesmo recorte do mês anterior e do mesmo mês do ano anterior.

**Comportamentos:**
- Passar o mouse sobre um comparativo mostra o valor do período comparado (ex.: "Set/2026: R$ 12.300,00").
- Sem venda no período comparado, o comparativo mostra "—".

**Critérios de aceite:**

#### CA-B32-07 — Os dez cartões com os valores certos · prova: automática

- **Dado** no mês atual 3 vendas de 2 contatos, valores R$ 100, R$ 200 e R$ 300, descontos R$ 10, R$ 0 e vazio, peças 2, 3 e vazio
- **Quando** o usuário abre a Visão Geral
- **Então** os cartões mostram: positivados 2, vendas 3, bruto R$ 610,00, descontos R$ 10,00, líquido R$ 600,00, ticket por cliente R$ 300,00, por venda R$ 200,00, por peça R$ 120,00, peças por cliente 2,50 e peças 5

#### CA-B32-08 — Comparativo com o mês passado e com o ano passado · prova: automática

- **Dado** faturamento líquido de R$ 600 neste mês até hoje, R$ 500 no mesmo recorte do mês passado e R$ 800 no mesmo recorte do mesmo mês do ano passado
- **Quando** o usuário olha o cartão Faturamento líquido
- **Então** ele mostra "vs mês passado: +20,0%" em verde e "vs ano passado: −25,0%" em vermelho

#### CA-B32-09 — Comparação justa até o dia anterior · prova: automática

- **Dado** hoje é dia 20, com vendas no dia 20 deste mês e no dia 20 do mês passado
- **Quando** o cartão calcula "vs mês passado"
- **Então** as vendas do dia 20 ficam fora dos dois lados da comparação e o cabeçalho avisa "Comparativos até o dia 19"

#### CA-B32-10 — Sem base de comparação mostra traço · prova: automática

- **Dado** nenhuma venda no mesmo mês do ano passado
- **Quando** o usuário olha qualquer cartão
- **Então** "vs ano passado" mostra "—", sem percentual nem cor

### Vendas diárias

**Descrição:** gráfico de barras com o valor vendido em cada dia do período, com duas
linhas sobrepostas: peças vendidas e ticket médio por venda do dia.

**Comportamentos:**
- Passar o mouse num dia mostra valor, peças e ticket médio daquele dia.
- Dia sem venda aparece com barra zerada, não some do eixo.

**Critérios de aceite:**

#### CA-B32-11 — Um ponto por dia do período · prova: automática

- **Dado** o período Outubro de 2026 com vendas nos dias 3 e 17
- **Quando** o gráfico é calculado
- **Então** ele tem 31 dias no eixo, com valor, peças e ticket preenchidos nos dias 3 e 17 e zero nos demais

#### CA-B32-12 — Balão do dia · prova: manual

- **Dado** o gráfico com dados
- **Quando** a Marcelle passa o mouse numa barra
- **Então** aparece o dia, o valor vendido, as peças e o ticket médio, legíveis no tema escuro

### Projeção de vendas do mês atual

**Descrição:** gráfico com o realizado de cada dia já passado do mês atual (barras) e a
projeção para os dias que faltam (linha), com o total projetado do mês em destaque.
Aparece só quando o período é o mês atual.

**Comportamentos:**
- O total projetado é o realizado até ontem somado à média diária do realizado multiplicada pelos dias que faltam, contando o dia de hoje.
- Mês sem nenhuma venda mostra o bloco com "Sem vendas ainda este mês" e sem projeção.

**Critérios de aceite:**

#### CA-B32-13 — Projeção pela média diária · prova: automática

- **Dado** hoje é 11/10/2026 e o realizado de 1º a 10 soma R$ 1.000,00
- **Quando** a projeção é calculada
- **Então** a média diária é R$ 100,00, os 21 dias restantes projetam R$ 2.100,00 e o total projetado do mês é R$ 3.100,00

#### CA-B32-14 — Projeção só no mês atual · prova: automática

- **Dado** o usuário escolhe "Mês anterior"
- **Quando** a tela recarrega
- **Então** o bloco de projeção não aparece

### Vendas do período

**Descrição:** tabela com cada venda do período: contato, telefone, data, origem (manual,
catálogo, externa) com o número do pedido quando houver, atendente, cidade do contato,
UF, peças, forma de pagamento e valor. Com busca por nome do contato e botão Exportar.

**Comportamentos:**
- A tabela mostra as 50 vendas mais recentes; "Ver todas (N)" carrega o restante.
- Digitar na busca filtra pelo nome do contato.
- Clicar no nome do contato abre o perfil dele.
- Clicar em Exportar baixa a planilha com todas as vendas do período, respeitando o filtro de atendente (padrão da B30-04).

**Critérios de aceite:**

#### CA-B32-15 — A tabela lista as vendas do período · prova: automática

- **Dado** 3 vendas no mês e 1 no mês passado
- **Quando** o usuário abre a Visão Geral do mês atual
- **Então** a tabela tem 3 linhas, da mais recente para a mais antiga, cada uma com contato, telefone, data, origem, atendente, cidade, UF, peças, forma de pagamento e valor

#### CA-B32-16 — Busca por contato · prova: automática

- **Dado** vendas dos contatos "Loja da Ana" e "Bazar do Bruno"
- **Quando** o usuário digita "ana"
- **Então** só a linha da "Loja da Ana" permanece

#### CA-B32-17 — Exportar baixa as vendas do período · prova: automática

- **Dado** 3 vendas no período
- **Quando** o usuário clica em Exportar
- **Então** baixa uma planilha com 3 linhas e as mesmas colunas da tabela, com data e valor reconhecidos como data e número

### Forma de pagamento

**Descrição:** barras horizontais com o faturamento líquido por forma de pagamento, da
maior para a menor, cada uma com o valor e o percentual do total.

**Comportamentos:**
- Venda sem forma de pagamento entra na barra "Não informada".

**Critérios de aceite:**

#### CA-B32-18 — Faturamento por forma de pagamento · prova: automática

- **Dado** vendas de R$ 300 em Pix, R$ 100 em Boleto e R$ 100 sem forma de pagamento
- **Quando** o bloco é calculado
- **Então** ele lista Pix R$ 300,00 (60,0%), Boleto R$ 100,00 (20,0%) e Não informada R$ 100,00 (20,0%), nessa ordem

### Variação por UF em relação ao ano anterior

**Descrição:** tabela por UF do contato com clientes positivados, crescimento de
clientes contra o mesmo período do ano anterior, vendas (faturamento líquido),
crescimento de vendas e ticket médio por cliente, com linha de total e botão Exportar
Excel. Segue a comparação justa (D-1) quando o mês atual está incluído.

**Comportamentos:**
- Contato sem UF entra na linha "Sem UF".
- Clicar no título de uma coluna ordena por ela.
- Sem base no ano anterior, o crescimento mostra "—".

**Critérios de aceite:**

#### CA-B32-19 — Linhas por UF com crescimento · prova: automática

- **Dado** neste período 2 clientes de "PE" faturando R$ 1.000 e, no mesmo período do ano passado, 1 cliente de "PE" faturando R$ 800
- **Quando** a tabela é calculada
- **Então** a linha PE mostra clientes 2, crescimento de clientes +100,00%, vendas R$ 1.000,00, crescimento de vendas +25,00% e ticket médio R$ 500,00; o total repete os mesmos números

#### CA-B32-20 — Exportar a variação por UF · prova: automática

- **Dado** a tabela com 2 UFs
- **Quando** o usuário clica em Exportar Excel
- **Então** baixa uma planilha com as 2 linhas, a linha de total e as mesmas colunas

### Valor vendido nos últimos 25 meses

**Descrição:** gráfico com uma barra por mês, dos últimos 25 meses até o atual, e uma
linha com a variação percentual de cada mês contra o mesmo mês do ano anterior. Ignora o
filtro de período; respeita o de atendente. O mês atual conta só até ontem.

**Comportamentos:**
- Passar o mouse num mês mostra o valor e a variação.
- Mês sem o mesmo mês do ano anterior (os 12 primeiros do gráfico, ou sem venda na base) mostra a variação como "—".

**Critérios de aceite:**

#### CA-B32-21 — 25 meses com variação anual · prova: automática

- **Dado** hoje é 21/10/2026, com R$ 500 em Out/2025 e R$ 600 em Out/2026 até o dia 20
- **Quando** o gráfico é calculado
- **Então** ele vai de Out/2024 a Out/2026, com 25 meses, e Out/2026 mostra R$ 600,00 com variação +20,0%

### UF do contato

**Descrição:** o contato ganha o campo UF (sigla do estado, lista fixa das 27 unidades),
ao lado da cidade, em todo lugar onde a cidade já é editada ou mostrada: diálogo de novo
contato, perfil do contato e painel do contato no chat.

**Comportamentos:**
- Escolher a UF numa lista com as 27 siglas, ou deixar em branco.
- A UF aparece ao lado da cidade no perfil e no painel do chat ("Recife · PE").
- Contatos antigos ficam sem UF até alguém preencher.

**Critérios de aceite:**

#### CA-B32-25 — Salvar a UF do contato · prova: automática

- **Dado** o perfil de um contato sem UF
- **Quando** o usuário escolhe "PE" e salva
- **Então** o perfil mostra "PE" ao lado da cidade e o valor fica gravado no contato

#### CA-B32-26 — UF só aceita sigla válida · prova: automática

- **Dado** um pedido de salvar contato com UF "XX"
- **Quando** o servidor valida
- **Então** recusa com a mensagem "UF inválida" e nada é gravado

### Correção do Dashboard: compra de hoje antes do meio-dia

**Descrição:** o Dashboard e o relatório passam a usar o mesmo cálculo de período, em
que o fim do período é o fim do dia de hoje, não a hora atual.

**Critérios de aceite:**

#### CA-B32-22 — Compra de hoje conta a qualquer hora · prova: automática

- **Dado** uma compra registrada hoje e o relógio marcando 9h
- **Quando** o Dashboard calcula a receita dos últimos 30 dias
- **Então** a compra está no total

### Aprovação visual

#### CA-B32-23 — A Visão Geral aprovada pela Marcelle em produção · prova: manual

- **Dado** a empresa "[TESTE] Automações B11" com vendas semeadas em meses diferentes
- **Quando** a Marcelle abre `/relatorios` em produção, no computador e no celular
- **Então** os blocos aparecem na ordem da spec, legíveis no tema escuro, e os números batem com as vendas semeadas

## Fora de escopo

- As outras abas: RFV, Coorte, Funil de clientes, Carteiras. Cada uma vira série própria.
- "Ver histórico" de um cartão (série mensal de uma métrica) e "Detalhar clientes" (lista dos positivados). O gráfico de 25 meses e a tabela de vendas cobrem o essencial; os atalhos ficam para depois, se fizerem falta.
- CPF/CNPJ e status da venda, que o Tailor mostra e o CRM não guarda.
- UF em outros lugares além do contato e do relatório: segmentar campanha por UF, gatilho e ação de automação por UF, coluna na lista de contatos e planilha de importação. Cada um é ajuste pequeno, pedido à parte.
- Filtro por loja e por categoria de produto. O CRM tem um catálogo por empresa e a venda manual não tem itens.
- Integração com ERP. A compra já nasce preparada (B30); ligar um sistema externo é série própria.
- Mudar o Dashboard além da correção do período. Ele continua como está.
- Decisões das séries seguintes, mantidas aqui para não se perderem: se o perfil RFV substitui a classificação por etapa do funil de Recompra; qual o limiar de dias para "cliente parado"; se a carteira do vendedor é o atendente do contato.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-01 | "Qtd de pedidos" do Tailor vira "Qtd de vendas", contando toda compra do contato, de qualquer origem. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-02 | "Qtd de produtos" do Tailor vira "Qtd de peças", a soma das peças informadas nas vendas; venda sem peças conta zero. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-03 | Faturamento bruto = valor pago + desconto, já que o valor da compra é líquido (SUP-B30-01). | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-04 | A projeção do mês é o realizado até ontem mais a média diária simples (realizado ÷ dias passados) vezes os dias que faltam, contando hoje. Sem distinguir dia útil de fim de semana. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-05 | A tabela "Variação em relação ao ano anterior" do Tailor é por região; no CRM ela agrupa pela cidade do contato, que é o que existe. | invalidada | O contato ganha o campo UF e a tabela agrupa por UF, como no Tailor. Marcelle, 21/10/2026 |
| SUP-B32-06 | Enquanto só a Visão Geral existe, a tela não mostra abas; a estrutura fica pronta e as abas aparecem quando a segunda nascer. | invalidada | As abas futuras aparecem desativadas, com "em breve". Marcelle, 21/10/2026 |
| SUP-B32-07 | A seleção de meses é dentro de um mesmo ano, como no Tailor. Período livre por datas não entra. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-08 | O gráfico de 25 meses e a projeção seguem o filtro de atendente; só ignoram o de período. | confirmada | Marcelle, 21/10/2026 |
| SUP-B32-09 | A UF entra só onde a cidade já é editada ou mostrada (novo contato, perfil, painel do chat) e no relatório. Campanhas, automações, lista de contatos e importação ficam para depois. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B32-01 | O comparativo "vs ano passado" compara com o mesmo mês do ano anterior (Out/2025 contra Out/2026). Confirma? A alternativa seria o acumulado do ano. | respondida | Sim, mesmo mês do ano anterior. Marcelle, 21/10/2026 |
| PER-B32-02 | A tabela de vendas mostra a cidade do contato. Vale a pena também a coluna "Telefone", como no Tailor? | respondida | Sim, com a coluna de telefone, na tela e na planilha. Marcelle, 21/10/2026 |
