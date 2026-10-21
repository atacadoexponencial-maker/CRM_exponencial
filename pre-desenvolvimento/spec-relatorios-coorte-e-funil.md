# Spec: Relatórios — Coorte e Funil de clientes

> série: B34
> estado: aprovada em 21/10/2026

## Visão Geral

A tela Relatórios ganha mais duas abas, no modelo do Tailor:

- **Coorte**: agrupa os clientes pelo mês da primeira compra e mostra, mês a mês depois
  dela, quantos continuam comprando (retenção) e quanto gastam por venda (valor médio),
  com a retenção média geral e a recompra geral por mês.
- **Funil de clientes**: quantos clientes já fizeram 1+, 2+ … 7+ compras, a conversão
  entre uma etapa e a próxima, o ticket médio de cada etapa e quantos estão parados.

Tudo nasce da compra do contato (B30), calculado na hora, sem tabela ou rotina nova. Vale
a mesma regra de acesso das outras abas: Admin e Gerente com filtro de atendente; o
Atendente vê só os clientes dele. Resolve duas perguntas que o CRM não respondia: "os
clientes que entram voltam a comprar?" e "quantos passam da primeira compra para a
segunda, da segunda para a terceira?".

### Vocabulário

| Termo | Significado no CRM |
|---|---|
| Base | Contatos com ao menos uma venda, fora da lixeira (a mesma do RFV) |
| Coorte | Mês da primeira venda do cliente (ex.: "Out/2025"). A aba mostra as 12 coortes mais recentes, da mais antiga para a mais recente |
| Mês k da coorte | O mês calendário k meses depois do mês da coorte. Mês 0 é o próprio mês da primeira venda |
| Idade da coorte | Quantos meses se passaram do mês da coorte até o mês atual. Mês k só existe se k ≤ idade; além disso a célula mostra "—" |
| Retenção no mês k | Clientes da coorte com ao menos uma venda no mês k ÷ clientes da coorte. Mês 0 é sempre 100% |
| Valor médio de venda no mês k | Faturamento líquido das vendas dos clientes da coorte no mês k ÷ quantidade dessas vendas. Sem venda: "—" |
| Retenção média geral | Média das retenções dos meses 1 a 11 de todas as coortes, ponderada pelo tamanho da coorte: Σ (clientes × retenção) ÷ Σ (clientes × meses existentes), contando zeros |
| Recompra geral no mês k | Σ clientes (de todas as coortes) com venda no mês k ÷ Σ clientes das coortes que já têm o mês k |
| Etapa "N+ compras" | Clientes com ao menos N vendas em toda a história |
| Conversão N → N+1 | Clientes da etapa N+1 ÷ clientes da etapa N |
| Ticket médio da etapa | Faturamento líquido de toda a história dos clientes da etapa ÷ clientes da etapa |
| Cliente parado | Sem venda há mais de 90 dias (o limiar decidido na B33) |

## Páginas / Módulos

### Aba Coorte

**Descrição:** a aba "Coorte" deixa de ser "em breve". Sem filtro de período; o filtro
de atendente da tela vale.

**Componentes:**
- Cartão "Retenção média geral" com o percentual e a explicação em uma linha.
- Gráfico "Recompra geral por mês": barras do Mês 1 ao Mês 11.
- Duas tabelas em abas internas, "Retenção de clientes" e "Valor médio de venda": uma linha por coorte (12 mais recentes), colunas Clientes e Mês 0 a Mês 11, com a cor da célula mais forte quanto maior o valor, e botão Exportar em cada uma.
- Bloco "Entenda a análise de coortes", recolhível, com as quatro explicações curtas do Tailor.

**Comportamentos:**
- Clicar na aba mostra os blocos acima, calculados para hoje.
- Trocar o atendente recalcula tudo com os clientes dele.
- Alternar "Retenção de clientes" e "Valor médio de venda" troca a tabela.
- Exportar baixa a tabela visível em Excel, com as mesmas linhas e colunas.
- Passar o mouse numa célula mostra o mês calendário e, na retenção, quantos clientes.

**Critérios de aceite:**

#### CA-B34-01 — A aba Coorte abre o relatório · prova: automática

- **Dado** a tela Relatórios aberta
- **Quando** o usuário clica na aba "Coorte"
- **Então** a aba fica selecionada e aparecem a retenção média geral, o gráfico de recompra por mês, as tabelas e o bloco "Entenda"

#### CA-B34-02 — Coorte é o mês da primeira venda, 12 linhas e 12 colunas · prova: automática

- **Dado** hoje 21/10/2026 e clientes com primeira venda em Out/2025, Mar/2026 e Set/2024
- **Quando** as coortes são calculadas
- **Então** há 12 linhas, de Nov/2025 a Out/2026, com Mês 0 a Mês 11; o cliente de Set/2024 fica fora; a coorte Mar/2026 tem idade 7 e as células do Mês 8 em diante são "—"

#### CA-B34-03 — Retenção por mês · prova: automática

- **Dado** a coorte Nov/2025 com 4 clientes, dos quais 1 comprou em Dez/2025 e 2 em Fev/2026
- **Quando** a retenção é calculada
- **Então** Mês 0 é 100%, Mês 1 é 25%, Mês 2 é 0% e Mês 3 é 50%

#### CA-B34-04 — Valor médio de venda por mês · prova: automática

- **Dado** a coorte Nov/2025 com 2 clientes que, em Dez/2025, fizeram três vendas de R$ 100, R$ 200 e R$ 300
- **Quando** o valor médio é calculado
- **Então** o Mês 1 mostra R$ 200,00 e um mês sem venda mostra "—"

#### CA-B34-05 — Retenção média geral ponderada · prova: automática

- **Dado** a coorte A com 4 clientes e idade 2 (Mês 1: 25%, Mês 2: 50%) e a coorte B com 2 clientes e idade 1 (Mês 1: 0%)
- **Quando** a retenção média geral é calculada
- **Então** ela é 30% ((4×25 + 4×50 + 2×0) ÷ (4×2 + 2×1))

#### CA-B34-06 — Recompra geral por mês · prova: automática

- **Dado** as mesmas coortes A e B
- **Quando** a recompra geral é calculada
- **Então** o Mês 1 é 16,7% (1 ÷ 6) e o Mês 2 é 50% (2 ÷ 4); do Mês 3 ao 11, "—"

#### CA-B34-07 — Exportar as tabelas de coorte · prova: automática

- **Dado** a tabela de retenção com 12 coortes
- **Quando** o usuário clica em Exportar
- **Então** baixa uma planilha com 12 linhas e as colunas Coorte, Clientes e Mês 0 a Mês 11, com os percentuais como número; a tabela de valor médio exporta os valores como moeda

#### CA-B34-08 — Atendente vê só os clientes dele na coorte · prova: automática

- **Dado** clientes de dois atendentes
- **Quando** um deles, com papel Atendente, abre a aba Coorte
- **Então** as coortes só contam os clientes dele

### Aba Funil de clientes

**Descrição:** a aba "Funil de clientes" deixa de ser "em breve". Sem filtro de período;
o filtro de atendente vale.

**Componentes:**
- Funil com sete etapas, "1+ compras" a "7+ compras", cada uma com a quantidade de clientes e a conversão para a etapa seguinte, nas cores do Tailor.
- Legenda ao lado com, por etapa, a quantidade e os parados.
- Cartões "Taxas de conversão": 1º → 2º … 6º → 7º.
- Tabela por etapa: clientes, conversão, ticket médio e parados.
- Link "O que são clientes parados?" que abre a explicação (90 dias sem venda).
- Bloco "Como melhorar suas taxas de conversão" com as cinco dicas do Tailor.

**Critérios de aceite:**

#### CA-B34-09 — Etapas do funil com quantidade, conversão e ticket médio · prova: automática

- **Dado** 10 clientes com 1 venda de R$ 100 cada, 5 com 2 vendas (R$ 100 cada venda) e 2 com 3 vendas (R$ 100 cada venda)
- **Quando** o funil é calculado
- **Então** 1+ tem 17 clientes, 2+ tem 7, 3+ tem 2 e 4+ a 7+ têm 0; as conversões são 41,2% (1→2) e 28,6% (2→3); o ticket médio de 2+ é R$ 242,86 (1.700 ÷ 7)

#### CA-B34-10 — Clientes parados por etapa · prova: automática

- **Dado** hoje 21/10/2026 e, na etapa 2+, um cliente com última venda há 91 dias e outro há 90 dias
- **Quando** os parados são contados
- **Então** a etapa 2+ mostra 1 parado

#### CA-B34-11 — A aba Funil de clientes abre o relatório · prova: automática

- **Dado** a tela Relatórios aberta
- **Quando** o usuário clica na aba "Funil de clientes"
- **Então** a aba fica selecionada e aparecem o funil com as sete etapas, a legenda, os cartões de conversão, a tabela e as dicas

### Aprovação visual

#### CA-B34-12 — As abas Coorte e Funil aprovadas pela Marcelle em produção · prova: manual

- **Dado** a empresa "[TESTE] Automações B11" com as vendas de 25 meses
- **Quando** a Marcelle abre as abas Coorte e Funil de clientes em produção, no computador e no celular
- **Então** as tabelas de coorte têm a cor por intensidade, o funil tem as sete etapas coloridas, tudo legível no tema escuro e os números batem com a base

## Fora de escopo

- Filtro por loja (o CRM tem uma loja por empresa).
- Clicar numa etapa do funil para listar os clientes dela. Ajuste pequeno depois, se fizer falta.
- Exportar o funil em Excel ou PDF.
- Carteiras: série própria, a última do modelo Tailor.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B34-01 | As etapas do funil contam todas as vendas do cliente em toda a história, não só nos últimos 12 meses. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-02 | Mês k de uma coorte só existe se k ≤ idade da coorte (o mês atual, mesmo incompleto, conta); retenção zero entra na média geral e no gráfico de recompra como zero, não é descartada como o Tailor faz. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-03 | "Cliente parado" no funil = sem venda há mais de 90 dias, o limiar da B33. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-04 | A recompra geral no mês k divide pelos clientes das coortes que já chegaram ao mês k, não por todas as coortes. | confirmada | Marcelle, 21/10/2026 |
| SUP-B34-05 | "Valor médio de pedido" do Tailor vira "valor médio de venda": por venda, não por cliente. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
