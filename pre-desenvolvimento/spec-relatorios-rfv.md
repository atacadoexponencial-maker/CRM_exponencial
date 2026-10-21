# Spec: Relatórios — RFV

> série: B33
> estado: aprovada em 21/10/2026

## Visão Geral

A tela Relatórios (B32) ganha a segunda aba, **RFV**: cada cliente que já comprou recebe
uma nota de Recência (há quantos dias comprou), Frequência (quantas vezes comprou) e Valor
(quanto gastou), e a combinação das notas o coloca num dos onze perfis do modelo Tailor
(Campeão, Clientes Fiéis, Potencial Fiel, Clientes Recentes, Clientes Promissores, Precisa
de Atenção, Não Perder, Em Risco, Semi Perdido, Hibernando, Perdido). A aba mostra a
matriz Recência × FV, os indicadores de cada perfil, a lista de clientes por perfil com
Excel, e a evolução dos perfis semana a semana e mês a mês, com a "base saudável".

Tudo nasce da compra do contato (B30) e é calculado na hora: não há tabela nova nem rotina
nova. É para o Admin e o Gerente, que decidem onde a equipe de Recompra gasta energia, e
para o Atendente, que vê só os próprios clientes. Resolve o problema de o CRM não dizer,
com base no que foi vendido, quem está prestes a sumir e quem merece atenção.

Decisões da Marcelle em 21/10/2026:

- o RFV **convive** com o funil de Recompra: é relatório, não move card;
- Recência por **faixas fixas de dias**; o limiar de "cliente parado" fica em 90 dias;
- Frequência e Valor por **quintis da própria base**, nos últimos 12 meses;
- a evolução é **calculada do histórico** de compras, sem foto semanal gravada.

### Vocabulário do RFV (como cada nota é calculada)

| Termo | Significado no CRM |
|---|---|
| Base RFV | Contatos da empresa com ao menos uma venda registrada e fora da lixeira. Quem nunca comprou não entra |
| Data de referência | Hoje (no fuso da operação). Na evolução, o fim de cada semana ou mês |
| Recência (R) | Dias entre a última venda e a data de referência. Nota 5: até 30 dias; 4: 31 a 60; 3: 61 a 90; 2: 91 a 180; 1: mais de 180 |
| Frequência (F) | Vendas nos 12 meses até a data de referência. Nota por quintil da base: o quinto com mais vendas recebe 5, o quinto seguinte 4, e assim até 1. Clientes empatados recebem a mesma nota, a maior entre eles. Sem venda nos 12 meses: nota 1 |
| Valor (V) | Faturamento líquido nos 12 meses até a data de referência, mesma régua de quintis. Sem venda nos 12 meses: nota 1 |
| FV | Média de F e V, arredondada para cima (3 e 4 dá 4) |
| Perfil | Cruzamento de R com FV na matriz abaixo |
| Ativo | Cliente com card no funil de Recompra em Onboarding, Reposição ou Ativos |
| Sem lembrete 15d+ | Cliente sem nenhum lembrete da Agenda (pendente ou feito) criado nos últimos 15 dias |
| Base saudável | Soma dos perfis Campeão, Clientes Fiéis, Potencial Fiel, Clientes Recentes e Clientes Promissores |

Matriz de perfis (linha = FV, coluna = R), exatamente como o Tailor:

| FV \ R | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 5 | Não Perder | Em Risco | Clientes Fiéis | Clientes Fiéis | Campeão |
| 4 | Em Risco | Em Risco | Clientes Fiéis | Clientes Fiéis | Clientes Fiéis |
| 3 | Em Risco | Em Risco | Precisa de Atenção | Potencial Fiel | Potencial Fiel |
| 2 | Perdido | Hibernando | Semi Perdido | Potencial Fiel | Potencial Fiel |
| 1 | Perdido | Perdido | Semi Perdido | Clientes Promissores | Clientes Recentes |

Cores e ícones dos perfis seguem o Tailor (Campeão verde com troféu, Fiéis azul com
diamante, Potencial Fiel roxo com estrela, Recentes azul-claro, Promissores verde-água,
Precisa de Atenção amarelo, Não Perder vermelho-escuro, Em Risco laranja, Semi Perdido
laranja-escuro, Hibernando cinza, Perdido vermelho).

## Páginas / Módulos

### Aba RFV na tela Relatórios

**Descrição:** a aba "RFV" deixa de ser "em breve" e passa a abrir o relatório. Não há
filtro de período: o RFV é sempre de hoje. O filtro de atendente da tela vale (Admin e
Gerente); o Atendente vê só os clientes dele.

**Componentes:**
- Aba "RFV" ativa; "Coorte", "Funil de clientes" e "Carteiras" continuam "em breve".
- Cabeçalho com a data de referência ("Perfis em 21/10/2026") e o tamanho da base ("312 clientes com compra").
- Filtro de atendente (Admin e Gerente).

**Comportamentos:**
- Clicar na aba "RFV" mostra os quatro blocos abaixo.
- Trocar o atendente recalcula os quatro blocos com os clientes dele.
- Voltar para "Visão Geral" mantém a aba anterior funcionando como hoje.

**Critérios de aceite:**

#### CA-B33-01 — A aba RFV abre o relatório · prova: automática

- **Dado** a tela Relatórios aberta na Visão Geral
- **Quando** o usuário clica na aba "RFV"
- **Então** a aba fica selecionada, o cabeçalho diz a data de hoje e o tamanho da base, e aparecem a matriz, os indicadores, a lista de clientes e a evolução

#### CA-B33-02 — Notas e perfil de cada cliente · prova: automática

- **Dado** hoje 21/10/2026 e cinco clientes com última venda há 10, 45, 80, 120 e 200 dias, com 1, 2, 3, 4 e 5 vendas nos 12 meses e valores de R$ 100, R$ 200, R$ 300, R$ 400 e R$ 500
- **Quando** o RFV é calculado
- **Então** as notas R são 5, 4, 3, 2 e 1, as notas F e V são 1, 2, 3, 4 e 5, os FV são 1, 2, 3, 4 e 5, e os perfis são Clientes Recentes, Potencial Fiel, Precisa de Atenção, Em Risco e Não Perder

#### CA-B33-03 — Quem nunca comprou fica fora; quem não comprou em 12 meses tem F e V 1 · prova: automática

- **Dado** um contato sem venda, um contato na lixeira com venda e um contato cuja única venda foi há 14 meses
- **Quando** o RFV é calculado
- **Então** os dois primeiros não entram na base, e o terceiro entra com R 1, F 1, V 1 e perfil Perdido

#### CA-B33-04 — Empate recebe a mesma nota · prova: automática

- **Dado** dez clientes, todos com exatamente 2 vendas nos 12 meses
- **Quando** a nota de Frequência é calculada
- **Então** os dez recebem a mesma nota, 5

#### CA-B33-05 — Atendente vê só os clientes dele · prova: automática

- **Dado** clientes com compra de dois atendentes
- **Quando** um deles, com papel Atendente, abre a aba RFV
- **Então** a base, a matriz e a lista só têm os clientes dele, e os quintis são calculados só entre eles

### Matriz RFV

**Descrição:** grade 5 × 5 (linhas FV de 5 a 1, colunas R de 1 a 5). Cada célula mostra a
quantidade de clientes, o nome do perfil e o percentual de ativos, na cor do perfil.

**Comportamentos:**
- Clicar numa célula filtra a lista de clientes por aquela célula (R e FV); clicar de novo, ou no "×" do filtro, limpa.
- Célula vazia mostra 0 e continua clicável.

**Critérios de aceite:**

#### CA-B33-06 — A matriz conta os clientes por célula com o percentual de ativos · prova: automática

- **Dado** três clientes em R 5 / FV 5, dois deles com card em Ativos na Recompra
- **Quando** a matriz é desenhada
- **Então** a célula R 5 / FV 5 mostra "3", "Campeão" e "67% ativos", e as outras 24 células mostram seus próprios números (zero onde não há cliente)

#### CA-B33-07 — Clicar na célula filtra a lista · prova: automática

- **Dado** a matriz com clientes em duas células
- **Quando** o usuário clica na célula R 5 / FV 5
- **Então** a lista de clientes mostra só os daquela célula e indica o filtro ("Campeão · R 5 · FV 5"); clicar de novo limpa

### Indicadores por perfil

**Descrição:** tabela com uma linha por perfil (na ordem do Tailor): Clientes, Sem lembrete
15d+ (quantidade e percentual), Dias sem compra (média), Média de vendas (12 meses) e
Valor médio por cliente (12 meses).

**Critérios de aceite:**

#### CA-B33-08 — Indicadores de um perfil · prova: automática

- **Dado** dois clientes Campeão: um com última venda há 10 dias, 4 vendas e R$ 1.000 nos 12 meses e um lembrete criado há 3 dias; outro com última venda há 20 dias, 2 vendas e R$ 500 e nenhum lembrete
- **Quando** os indicadores são calculados
- **Então** a linha Campeão mostra clientes 2, sem lembrete 15d+ "1 (50%)", dias sem compra 15, média de vendas 3,0 e valor médio R$ 750,00

#### CA-B33-09 — Perfil sem cliente mostra zeros · prova: automática

- **Dado** nenhum cliente no perfil Hibernando
- **Quando** a tabela é desenhada
- **Então** a linha Hibernando aparece com 0 clientes e "—" nas médias

### Clientes por perfil

**Descrição:** lista paginada (25 por página) de clientes com perfil, notas R, F, V e FV,
dias sem compra, vendas e valor nos 12 meses, última venda, atendente do contato, cidade e
UF. Com busca pelo nome, seletor de perfil, filtro pela célula da matriz e botão Excel.

**Comportamentos:**
- O nome do cliente abre o perfil do contato.
- Escolher um perfil no seletor filtra a lista; "Todos" mostra tudo.
- Buscar pelo nome filtra sem acento e sem diferença de maiúsculas.
- "Excel" baixa todos os clientes do filtro atual (perfil ou célula e busca), com as mesmas colunas.
- Ordenação padrão: perfil mais valioso primeiro (ordem do Tailor), depois dias sem compra crescente.

**Critérios de aceite:**

#### CA-B33-10 — Lista com as colunas e a paginação · prova: automática

- **Dado** 30 clientes na base
- **Quando** o usuário abre a lista
- **Então** aparecem 25 linhas com nome, perfil, R, F, V, FV, dias sem compra, vendas e valor em 12 meses, última venda, atendente, cidade e UF, o rodapé diz "Mostrando 1–25 de 30" e a seta avança para os 5 restantes

#### CA-B33-11 — Filtro por perfil e busca · prova: automática

- **Dado** clientes Campeão e Perdido, entre eles "Loja da Ana" (Campeão)
- **Quando** o usuário escolhe "Campeão" e digita "ana"
- **Então** só a "Loja da Ana" fica na lista

#### CA-B33-12 — Excel com o filtro atual · prova: automática

- **Dado** a lista filtrada em "Campeão" com 2 clientes
- **Quando** o usuário clica em Excel
- **Então** baixa uma planilha com as 2 linhas e as colunas da lista, com datas e números reconhecidos como tal

### Evolução dos perfis

**Descrição:** tabela com uma linha por perfil e uma coluna por semana (últimas 14
semanas, a mais recente primeiro, rotulada "S43 · 19/10") ou por mês (últimos 13 meses),
com a quantidade de clientes e a diferença contra a coluna anterior (número e percentual,
verde ou vermelho). Abaixo, a "base saudável": última coluna, anterior, crescimento e
variação.

**Comportamentos:**
- Alternar "Semanal" e "Mensal" troca as colunas.
- O perfil de cada coluna é calculado com a data de referência no fim daquela semana (domingo) ou mês; a coluna atual usa hoje.
- Passar o mouse numa célula mostra a data de referência exata.

**Critérios de aceite:**

#### CA-B33-13 — Colunas semanais com a diferença · prova: automática

- **Dado** hoje 21/10/2026 (semana 43) e um cliente que era Campeão até 11/10 e passou a Clientes Fiéis depois
- **Quando** a evolução semanal é calculada
- **Então** há 14 colunas, da S43 à S30; Campeão mostra 1 na S41 e 0 na S42 e S43, com "−1 (−100%)" na S42; Clientes Fiéis mostra 0 na S41 e 1 na S42, com "+1"

#### CA-B33-14 — Colunas mensais · prova: automática

- **Dado** hoje 21/10/2026
- **Quando** o usuário escolhe "Mensal"
- **Então** há 13 colunas, de Out/2026 a Out/2025, cada uma com o perfil calculado no último dia do mês (Out/2026 em 21/10)

#### CA-B33-15 — Base saudável · prova: automática

- **Dado** 64 clientes saudáveis na coluna atual e 71 na anterior
- **Quando** o bloco é desenhado
- **Então** mostra "64 clientes", "71 clientes", crescimento "−7" e variação "−10%", em vermelho

### Aprovação visual

#### CA-B33-16 — A aba RFV aprovada pela Marcelle em produção · prova: manual

- **Dado** a empresa "[TESTE] Automações B11" com as vendas de 25 meses
- **Quando** a Marcelle abre a aba RFV em produção, no computador e no celular
- **Então** a matriz tem as cores e os nomes dos perfis, os blocos aparecem na ordem da spec, legíveis no tema escuro, e clicar numa célula filtra a lista

## Fora de escopo

- Mover o card da Recompra pelo perfil RFV, ou gatilho/condição de automação pelo perfil. Decisão: convivem. Automação pelo perfil é ajuste pequeno depois, pedido à parte.
- Mostrar o perfil RFV no perfil do contato, na lista de contatos ou no chat.
- Exportar em PDF (o Tailor tem; o CRM só exporta Excel).
- Configurar as faixas de Recência por empresa. Ficam fixas (30/60/90/180).
- Foto semanal gravada em tabela. A evolução é calculada do histórico.
- Carteiras e a pergunta "carteira = atendente do contato": série própria.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B33-01 | "Ticket médio" da tabela de indicadores do Tailor vira "Valor médio por cliente (12 meses)": o faturamento líquido do perfil dividido pelos clientes dele. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-02 | "Sem tarefa 15d+" do Tailor vira "Sem lembrete 15d+": cliente sem lembrete da Agenda criado nos últimos 15 dias, pendente ou feito. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-03 | "% ativos" da matriz usa o card do funil de Recompra em Onboarding, Reposição ou Ativos, a mesma régua do Dashboard. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-04 | A evolução mostra as últimas 14 semanas (semana termina no domingo) e os últimos 13 meses; não o ano inteiro como o Tailor, para a tela abrir rápido. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-05 | A aba RFV não tem filtro de período: a data de referência é sempre hoje. | confirmada | Marcelle, 21/10/2026 |
| SUP-B33-06 | O Excel da lista traz as mesmas colunas da tela e respeita o filtro atual (perfil ou célula e busca). | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|

Nenhuma.
