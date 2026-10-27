# Spec: Correções do teste de UI/UX de 27/10/2026

> série: B46
> estado: escrita em 27/10/2026 a partir de `analise-qa/qa-ux-2026-10-27.md`; o Luan pediu as issues e a correção no branch `b46-correcoes-qa-ux`, com merge só depois do ok dele

## Visão Geral

Um teste de UI/UX percorreu o CRM inteiro em produção no dia 27/10/2026, nos
fluxos de um atendimento comum. Os achados, com a gravidade de cada um, estão em
`pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`. Esta spec traz os que têm
correção decidida: horários errados, a lista do Chat que pula, o menu que não
diz de qual linha é, janelas que não fecham com Esc e salvamentos sem aviso,
follow-up sem editar nem apagar, variáveis perdidas nas automações, automação
que nasce ligada, abas dos Relatórios sem endereço, números com o mesmo nome e
significados diferentes, a tabela de Contatos, a largura das telas e os
acabamentos.

Os achados de clareza que mudam o produto (C-01 a C-35) esperam a decisão do
Luan e ficam fora desta spec até lá.

## Páginas / Módulos

### 1. Datas e horas no horário de Brasília (B46-01)

**Comportamentos:** toda data e hora mostrada pelo CRM sai no fuso
`America/Sao_Paulo`, seja ela formatada no servidor ou no navegador. A mesma
data aparece igual nos dois, e a tela não troca o texto ao carregar.

#### CA-B46-01 — Histórico do card na hora de Brasília · prova: automática

- **Dado** um card movido às 15:00 de Brasília (18:00 UTC), com o servidor em UTC
- **Quando** o histórico do card é montado
- **Então** o movimento aparece com "15:00", e não "18:00"

#### CA-B46-02 — Nenhuma data na tela sem fuso · prova: automática

- **Dado** o código das telas em `src/app` e `src/components`
- **Quando** se procura `toLocaleString`, `toLocaleDateString` ou `toLocaleTimeString` sem `timeZone`
- **Então** não há nenhum: toda data passa pelo fuso da operação

#### CA-B46-03 — Campanhas abrem sem erro de hidratação · prova: manual

- **Dado** a empresa de teste em produção, depois da mudança
- **Quando** se abre `/campanhas` com o console aberto
- **Então** não aparece o erro React #418, e as datas da lista são as de Brasília

### 2. Lista do Chat parada ao abrir conversa (B46-02)

**Comportamentos:** a conversa sobe para o topo só quando chega ou sai
mensagem nova. Abrir, ler, mudar o status ou a etiqueta atualiza a linha no
lugar.

#### CA-B46-04 — Abrir conversa não muda a ordem · prova: automática

- **Dado** a lista com as conversas A (mais recente), B e C
- **Quando** chega a atualização de C só com `unread_count` zerado, sem `last_message_at` novo
- **Então** a ordem continua A, B, C, e C aparece sem não lidas

#### CA-B46-05 — Mensagem nova continua subindo a conversa · prova: automática

- **Dado** a mesma lista
- **Quando** chega a atualização de C com `last_message_at` mais novo que o de A
- **Então** a ordem passa a ser C, A, B

### 3. Menu de cada linha diz de quem é (B46-03)

**Comportamentos:** o botão "⋯" de cada linha das listas de configuração tem
o nome da linha ("Abrir menu de Interessado", como já é nas Automações), e a confirmação de apagar mostra o
nome em destaque.

#### CA-B46-06 — Botão de menu com o nome da linha · prova: automática

- **Dado** as etiquetas "Interessado" e "Cliente" na lista de Etiquetas
- **Quando** a lista é desenhada
- **Então** os botões de menu se chamam "Abrir menu de Interessado" e "Abrir menu de Cliente", e não só "Abrir menu"

#### CA-B46-07 — Confirmação de apagar com o nome em destaque · prova: automática

- **Dado** a etiqueta "Interessado"
- **Quando** se escolhe Apagar no menu dela
- **Então** a confirmação mostra "Interessado" em negrito, antes do botão de confirmar

### 4. Esc fecha as janelas e salvar confirma (B46-04)

**Comportamentos:** toda janela e painel por cima da tela fecha com Esc, sem
salvar. Salvar produto, lead, funil, campo personalizado e etiqueta mostra uma
confirmação curta, no mesmo padrão das automações.

#### CA-B46-08 — Esc fecha "Novo lead" e mensagens rápidas · prova: automática

- **Dado** a janela "Novo lead" aberta no Pipeline, ou o painel de mensagens rápidas aberto no Chat
- **Quando** se aperta Esc
- **Então** a janela fecha e nada é criado

#### CA-B46-09 — Salvar mostra confirmação · prova: automática

- **Dado** o formulário de produto, de lead, de funil, de campo personalizado ou de etiqueta
- **Quando** o salvamento dá certo
- **Então** aparece uma confirmação curta ("Produto salvo", "Lead criado", "Funil salvo", "Campo salvo", "Etiqueta salva")

### 5. Dashboard mostra "Áudio" e não o endereço (B46-05)

**Comportamentos:** o resumo da última mensagem é o mesmo no Dashboard e no
Chat. Mídia aparece pelo tipo ("Áudio", "Imagem", "Vídeo", "Documento").

#### CA-B46-10 — Resumo da mídia sem endereço · prova: automática

- **Dado** uma conversa cuja última mensagem é "[audio] https://…supabase.co/storage/…"
- **Quando** o Dashboard monta "Esperando resposta"
- **Então** a linha mostra "Áudio", sem o endereço

### 6. Follow-up com editar, apagar e desfazer (B46-06)

**Comportamentos:** cada follow-up da Agenda pode ser editado (contato, data,
hora, nota) e apagado. "Feito" mostra "Feito. Desfazer" por alguns segundos.
"Agendar" diz o que falta. O nome do contato no item leva à ficha dele.

#### CA-B46-11 — Editar follow-up · prova: automática

- **Dado** o follow-up de amanhã para a Ana com a nota "Ligar"
- **Quando** o dono do follow-up muda a data para depois de amanhã e a nota para "Ligar às 10h"
- **Então** o follow-up fica com a data e a nota novas, e a data no passado continua recusada

#### CA-B46-12 — Apagar follow-up · prova: automática

- **Dado** o follow-up da Ana
- **Quando** o dono confirma Apagar
- **Então** o follow-up sai da Agenda e do banco

#### CA-B46-13 — Desfazer o Feito · prova: automática

- **Dado** o follow-up da Ana marcado como Feito
- **Quando** se clica em Desfazer
- **Então** o follow-up volta para a Agenda como pendente, com a mesma data

#### CA-B46-14 — Qualquer usuário da empresa mexe no follow-up, e só da empresa · prova: automática

- **Dado** o follow-up de um atendente da empresa
- **Quando** outro Atendente da mesma empresa edita ou apaga, e um usuário de outra empresa tenta o mesmo
- **Então** o da mesma empresa consegue, e o de outra empresa é recusado sem mudar nada

#### CA-B46-15 — Agendar diz o que falta · prova: automática

- **Dado** o formulário de Novo follow-up sem contato escolhido
- **Quando** se clica em Agendar
- **Então** aparece "Escolha o contato", e nada é criado

### 7. Variáveis das automações sem perda e em linguagem simples (B46-07)

**Comportamentos:** o exemplo dos campos de texto não usa chaves. Clicar numa
variável e salvar sem "Inserir" não descarta nada em silêncio. As mensagens de
erro aparecem uma por linha, fora do painel. O texto diz "automação", não
"regra".

#### CA-B46-16 — Exemplo sem chaves · prova: automática

- **Dado** o campo de texto do lembrete e o da mensagem no editor
- **Quando** estão vazios
- **Então** o exemplo não tem `{{` e diz para clicar no botão do nome

#### CA-B46-17 — Variável pendente não some ao salvar · prova: automática

- **Dado** o campo do lembrete com "Ligar para " e a caixa do "Primeiro nome" aberta, sem "Inserir"
- **Quando** se clica em Salvar
- **Então** a variável é inserida com o texto reserva da caixa (ou "cliente", se vazio) antes de salvar, e o lembrete fica "Ligar para {primeiro nome}"

#### CA-B46-18 — Erros do editor um por linha · prova: automática

- **Dado** uma automação sem nome, com um bloco incompleto e sem ação ligada
- **Quando** se clica em Salvar
- **Então** os três problemas aparecem em três linhas, numa área que o painel lateral não cobre

### 8. Automação nova nasce desligada (B46-08)

**Comportamentos:** salvar uma automação nova grava a automação desligada. O
editor tem "Salvar" e "Salvar e ativar". Editar uma automação já ligada não a
desliga.

#### CA-B46-19 — Salvar automação nova grava desligada · prova: automática

- **Dado** uma automação nova, com o fluxo completo
- **Quando** se clica em Salvar
- **Então** ela é gravada com `ativa` falso e a lista mostra a chave desligada

#### CA-B46-20 — "Salvar e ativar" liga · prova: automática

- **Dado** a mesma automação nova
- **Quando** se clica em "Salvar e ativar"
- **Então** ela é gravada ligada, passando pela mesma conferência do botão da lista

#### CA-B46-21 — Editar automação ligada mantém ligada · prova: automática

- **Dado** uma automação ligada
- **Quando** se muda o nome e salva
- **Então** ela continua ligada

### 9. Abas dos Relatórios no endereço (B46-09)

#### CA-B46-22 — Aba no endereço · prova: automática

- **Dado** a tela Relatórios
- **Quando** se abre a aba RFV
- **Então** o endereço fica `/relatorios?aba=rfv`, e abrir esse endereço direto mostra a aba RFV

#### CA-B46-23 — Voltar do navegador volta de aba · prova: manual

- **Dado** a Visão Geral aberta e depois a aba Coorte
- **Quando** se aperta Voltar no navegador
- **Então** a Visão Geral volta, sem sair dos Relatórios

### 10. Números com período e nome claros (B46-10)

#### CA-B46-24 — Cartões de faturamento dizem o período · prova: automática

- **Dado** o Dashboard em "30 dias" e os Relatórios em "mês"
- **Quando** os cartões de faturamento são desenhados
- **Então** cada um mostra a data inicial e a final ("01/10 a 27/10")

#### CA-B46-25 — "Leads" das Carteiras com outro nome · prova: automática

- **Dado** a aba Carteiras dos Relatórios
- **Quando** os totais são desenhados
- **Então** o número de contatos sem compra não se chama "Leads", e sim "Sem compra"

### 11. Tabela de Contatos legível e filtros recolhidos (B46-11)

#### CA-B46-26 — Palavra inteira nas células · prova: automática

- **Dado** a lista de Contatos com "Médio" e "Malha" nas células
- **Quando** a tabela é desenhada
- **Então** nenhuma célula quebra palavra no meio, e a tabela rola de lado quando não cabe, com todas as colunas inteiras

#### CA-B46-27 — Só a busca e a classificação ficam à vista · prova: automática

- **Dado** a tela Contatos
- **Quando** ela abre
- **Então** ficam à vista a busca e a faixa de classificação; tipo, atendente e salvos ficam atrás de "Filtrar", com o número de filtros ligados no botão

#### CA-B46-28 — Contatos no celular · prova: manual

- **Dado** o celular a 390 px
- **Quando** se abre Contatos
- **Então** a primeira linha da tabela aparece na primeira tela

### 12. Mesma margem e largura em todas as telas (B46-12)

#### CA-B46-29 — Um contêiner de página só · prova: automática

- **Dado** as páginas de `src/app/(auth)`
- **Quando** se confere o contêiner da página
- **Então** todas usam o mesmo componente de página, na largura normal ou na larga (tabelas e quadros)

#### CA-B46-30 — Título no mesmo lugar ao navegar · prova: manual

- **Dado** o desktop a 1440 px
- **Quando** se passa por Catálogo, Contatos, Automações, Funis, Agenda e Nova campanha
- **Então** o título começa no mesmo ponto em todas, e Times, Catálogo e Agenda não deixam metade da tela vazia

### 13. Acabamentos (B46-13)

#### CA-B46-31 — Funil sem nome barrado no formulário · prova: automática

- **Dado** o formulário "Novo funil" com o nome vazio
- **Quando** se clica em Criar
- **Então** "Informe o nome do funil." aparece na hora, junto do campo, sem ir ao servidor

#### CA-B46-32 — Nova etiqueta com cor marcada · prova: automática

- **Dado** o formulário "Nova etiqueta"
- **Quando** ele abre
- **Então** a primeira cor já vem marcada, e Salvar sem nome diz "Dê um nome à etiqueta"

#### CA-B46-33 — Sem "workspace" no texto · prova: automática

- **Dado** os textos das telas
- **Quando** se procura "workspace" em texto visível
- **Então** não há nenhum; aparece "empresa"

#### CA-B46-34 — Acabamentos visuais aprovados · prova: manual

- **Dado** a empresa de teste no preview
- **Quando** o Luan confere: "Editar funil" sem quebra e aberto perto do botão; mensagens rápidas com o nome inteiro; campos do produto no mesmo fundo; a barra de Aparência sem cobrir texto; Dashboard sem barras zeradas; Carteiras em tabela; lista de contatos do follow-up recolhida; editor de automação novo com a dica do "+"; seção "Agenda" visível no seletor; cartões de etapa sem "0 cards" quebrado
- **Então** ele aprova cada um, ou o que não aprovar volta para a issue

## Fora de escopo

- Os achados de clareza C-01 a C-35, até a decisão do Luan (ver o arquivo do QA).
- O "Abrir conversa" do card sem conversa (C-05): a B45 decidiu que vai com a spec de começar conversa.
- O que o teste não cobriu (envio de mensagem, número de WhatsApp, pedido, planilha, campanha, convites).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-01 | O fuso de todas as telas é o da operação (`America/Sao_Paulo`, já em `src/lib/datas.ts`), para todas as empresas | confirmada | Brasília é o padrão. Luan, 27/10/2026, que pediu também uma configuração para trocar o fuso: fica na B46-14, separada desta |
| SUP-B46-02 | O follow-up pode ser editado e apagado por quem o criou, pelo atendente dele e por Admin e Gerente, como já é no adiar | invalidada | Por enquanto, todo usuário da empresa edita e apaga qualquer follow-up da empresa (CA-B46-14 reescrito). Luan, 27/10/2026 |
| SUP-B46-03 | A variável pendente é inserida ao salvar, em vez de bloquear o Salvar (CA-B46-17) | confirmada | Luan, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-01 | A automação nova deve nascer desligada, com "Salvar e ativar" à parte? Hoje nasce ligada (B46-08) | respondida | Sim, nasce desligada. Luan, 27/10/2026 |
| PER-B46-02 | Que nome dar aos contatos sem compra nas Carteiras, para não confundir com os "Leads" do Pipeline? Sugestão: "Sem compra" (B46-10) | respondida | "Sem compra". Luan, 27/10/2026 |
