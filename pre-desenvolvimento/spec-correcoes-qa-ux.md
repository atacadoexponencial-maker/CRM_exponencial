# Spec: Correções do teste de UI/UX de 27/10/2026

> série: B47
> estado: escrita em 27/10/2026 a partir de `analise-qa/qa-ux-2026-10-27.md`; o Luan pediu as issues e a correção no branch `b46-correcoes-qa-ux`, com merge só depois do ok dele
> renumerada: nasceu como B46 e virou B47 em 28/10/2026, porque a série do banco de teste da Marcelle (`spec-banco-de-teste.md`) já tinha usado B46 na master. Os commits até cc8ebac dizem B46; o branch continua `b46-correcoes-qa-ux`. Decisão do Luan

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

Os achados de clareza entram pelas recomendações do arquivo do QA, aceitas pelo
Luan em 27/10/2026 (seções 15 a 19). Os que mudam o produto ficam fora (ver
"Fora de escopo"). O Luan pediu também o fuso configurável (seção 14).

## Páginas / Módulos

### 1. Datas e horas no horário de Brasília (B47-01)

**Comportamentos:** toda data e hora mostrada pelo CRM sai no fuso
`America/Sao_Paulo`, seja ela formatada no servidor ou no navegador. A mesma
data aparece igual nos dois, e a tela não troca o texto ao carregar.

#### CA-B47-01 — Histórico do card na hora de Brasília · prova: automática

- **Dado** um card movido às 15:00 de Brasília (18:00 UTC), com o servidor em UTC
- **Quando** o histórico do card é montado
- **Então** o movimento aparece com "15:00", e não "18:00"

#### CA-B47-02 — Nenhuma data na tela sem fuso · prova: automática

- **Dado** o código das telas em `src/app` e `src/components`
- **Quando** se procura formatação de data (`toLocaleDateString`, `toLocaleTimeString`, `toLocaleString` de uma data ou `Intl.DateTimeFormat`) sem `timeZone`
- **Então** não há nenhum: toda data passa pelo fuso da operação

#### CA-B47-03 — Campanhas abrem sem erro de hidratação · prova: manual

- **Dado** a empresa de teste em produção, depois da mudança
- **Quando** se abre `/campanhas` com o console aberto
- **Então** não aparece o erro React #418, e as datas da lista são as de Brasília

### 2. Lista do Chat parada ao abrir conversa (B47-02)

**Comportamentos:** a conversa sobe para o topo só quando chega ou sai
mensagem nova. Abrir, ler, mudar o status ou a etiqueta atualiza a linha no
lugar.

#### CA-B47-04 — Abrir conversa não muda a ordem · prova: automática

- **Dado** a lista com as conversas A (mais recente), B e C
- **Quando** chega a atualização de C só com `unread_count` zerado, sem `last_message_at` novo
- **Então** a ordem continua A, B, C, e C aparece sem não lidas

#### CA-B47-05 — Mensagem nova continua subindo a conversa · prova: automática

- **Dado** a mesma lista
- **Quando** chega a atualização de C com `last_message_at` mais novo que o de A
- **Então** a ordem passa a ser C, A, B

### 3. Menu de cada linha diz de quem é (B47-03)

**Comportamentos:** o botão "⋯" de cada linha das listas de configuração tem
o nome da linha ("Abrir menu de Interessado", como já é nas Automações), e a confirmação de apagar mostra o
nome em destaque.

#### CA-B47-06 — Botão de menu com o nome da linha · prova: automática

- **Dado** as etiquetas "Interessado" e "Cliente" na lista de Etiquetas
- **Quando** a lista é desenhada
- **Então** os botões de menu se chamam "Abrir menu de Interessado" e "Abrir menu de Cliente", e não só "Abrir menu"

#### CA-B47-07 — Confirmação de apagar com o nome em destaque · prova: automática

- **Dado** a etiqueta "Interessado"
- **Quando** se escolhe Apagar no menu dela
- **Então** a confirmação mostra "Interessado" em negrito, antes do botão de confirmar

### 4. Esc fecha as janelas e salvar confirma (B47-04)

**Comportamentos:** toda janela e painel por cima da tela fecha com Esc, sem
salvar. Salvar produto, lead, funil, campo personalizado e etiqueta mostra uma
confirmação curta, no mesmo padrão das automações.

#### CA-B47-08 — Esc fecha "Novo lead" e mensagens rápidas · prova: automática

- **Dado** a janela "Novo lead" aberta no Pipeline, ou o painel de mensagens rápidas aberto no Chat
- **Quando** se aperta Esc
- **Então** a janela fecha e nada é criado

#### CA-B47-09 — Salvar mostra confirmação · prova: automática

- **Dado** o formulário de produto, de lead, de funil, de campo personalizado ou de etiqueta
- **Quando** o salvamento dá certo
- **Então** aparece uma confirmação curta ("Produto salvo", "Lead criado", "Funil salvo", "Campo salvo", "Etiqueta salva")

### 5. Dashboard mostra "Áudio" e não o endereço (B47-05)

**Comportamentos:** o resumo da última mensagem é o mesmo no Dashboard e no
Chat. Mídia aparece pelo tipo ("Áudio", "Imagem", "Vídeo", "Documento").

#### CA-B47-10 — Resumo da mídia sem endereço · prova: automática

- **Dado** uma conversa cuja última mensagem é "[audio] https://…supabase.co/storage/…"
- **Quando** o Dashboard monta "Esperando resposta"
- **Então** a linha mostra "Áudio", sem o endereço

### 6. Follow-up com editar, apagar e desfazer (B47-06)

**Comportamentos:** cada follow-up da Agenda pode ser editado (contato, data,
hora, nota) e apagado. "Feito" mostra "Feito. Desfazer" por alguns segundos.
"Agendar" diz o que falta. O nome do contato no item leva à ficha dele.

#### CA-B47-11 — Editar follow-up · prova: automática

- **Dado** o follow-up de amanhã para a Ana com a nota "Ligar"
- **Quando** o dono do follow-up muda a data para depois de amanhã e a nota para "Ligar às 10h"
- **Então** o follow-up fica com a data e a nota novas, e a data no passado continua recusada

#### CA-B47-12 — Apagar follow-up · prova: automática

- **Dado** o follow-up da Ana
- **Quando** o dono confirma Apagar
- **Então** o follow-up sai da Agenda e do banco

#### CA-B47-13 — Desfazer o Feito · prova: automática

- **Dado** o follow-up da Ana marcado como Feito
- **Quando** se clica em Desfazer
- **Então** o follow-up volta para a Agenda como pendente, com a mesma data

#### CA-B47-14 — Quem vê o follow-up mexe nele, e só da empresa · prova: automática

- **Dado** o follow-up que a automação criou para a Ana
- **Quando** a Ana e o Gerente editam ou apagam, e o Admin de outra empresa tenta o mesmo
- **Então** a Ana e o Gerente conseguem, e o de outra empresa é recusado sem mudar nada

#### CA-B47-15 — Agendar diz o que falta · prova: automática

- **Dado** o formulário de Novo follow-up sem contato escolhido
- **Quando** se clica em Agendar
- **Então** aparece "Escolha o contato", e nada é criado

### 7. Variáveis das automações sem perda e em linguagem simples (B47-07)

**Comportamentos:** o exemplo dos campos de texto não usa chaves. Clicar numa
variável e salvar sem "Inserir" não descarta nada em silêncio. As mensagens de
erro aparecem uma por linha, fora do painel. O texto diz "automação", não
"regra".

#### CA-B47-16 — Exemplo sem chaves · prova: automática

- **Dado** o campo de texto do lembrete e o da mensagem no editor
- **Quando** estão vazios
- **Então** o exemplo não tem `{{` e diz para clicar no botão do nome

#### CA-B47-17 — Variável pendente não some ao salvar · prova: automática

- **Dado** o campo do lembrete com "Ligar para " e a caixa do "Primeiro nome" aberta, sem "Inserir"
- **Quando** se clica em Salvar
- **Então** a variável é inserida com o texto reserva da caixa (ou "cliente", se vazio) antes de salvar, e o lembrete fica "Ligar para {primeiro nome}"

#### CA-B47-18 — Erros do editor um por linha · prova: automática

- **Dado** uma automação sem nome, com um bloco incompleto e sem ação ligada
- **Quando** se clica em Salvar
- **Então** os três problemas aparecem em três linhas, numa área que o painel lateral não cobre

### 8. Automação nova nasce desligada (B47-08)

**Comportamentos:** salvar uma automação nova grava a automação desligada. O
editor tem "Salvar" e "Salvar e ativar". Editar uma automação já ligada não a
desliga.

#### CA-B47-19 — Salvar automação nova grava desligada · prova: automática

- **Dado** uma automação nova, com o fluxo completo
- **Quando** se clica em Salvar
- **Então** ela é gravada com `ativa` falso e a lista mostra a chave desligada

#### CA-B47-20 — "Salvar e ativar" liga · prova: automática

- **Dado** a mesma automação nova
- **Quando** se clica em "Salvar e ativar"
- **Então** ela é gravada ligada, passando pela mesma conferência do botão da lista

#### CA-B47-21 — Editar automação ligada mantém ligada · prova: automática

- **Dado** uma automação ligada
- **Quando** se muda o nome e salva
- **Então** ela continua ligada

### 9. Abas dos Relatórios no endereço (B47-09)

#### CA-B47-22 — Aba no endereço · prova: automática

- **Dado** a tela Relatórios
- **Quando** se abre a aba RFV
- **Então** o endereço fica `/relatorios?aba=rfv`, e abrir esse endereço direto mostra a aba RFV

#### CA-B47-23 — Voltar do navegador volta de aba · prova: manual

- **Dado** a Visão Geral aberta e depois a aba Coorte
- **Quando** se aperta Voltar no navegador
- **Então** a Visão Geral volta, sem sair dos Relatórios

### 10. Números com período e nome claros (B47-10)

#### CA-B47-24 — Cartões de faturamento dizem o período · prova: automática

- **Dado** o Dashboard em "30 dias" e os Relatórios em "mês"
- **Quando** os cartões de faturamento são desenhados
- **Então** cada um mostra a data inicial e a final ("01/10 a 27/10")

#### CA-B47-25 — "Leads" das Carteiras com outro nome · prova: automática

- **Dado** a aba Carteiras dos Relatórios
- **Quando** os totais são desenhados
- **Então** o número de contatos sem compra não se chama "Leads", e sim "Sem compra"

### 11. Tabela de Contatos legível e filtros recolhidos (B47-11)

#### CA-B47-26 — Palavra inteira nas células · prova: automática

- **Dado** a lista de Contatos com "Médio" e "Malha" nas células
- **Quando** a tabela é desenhada
- **Então** nenhuma célula quebra palavra no meio, e a tabela rola de lado quando não cabe, com todas as colunas inteiras

#### CA-B47-27 — Tipo e atendente recolhidos · prova: automática

- **Dado** a tela Contatos
- **Quando** ela abre
- **Então** ficam à vista a busca, os filtros salvos da empresa e a faixa de classificação; tipo e atendente ficam atrás de "Mais filtros", com o número dos ligados no botão

#### CA-B47-28 — Contatos no celular · prova: manual

- **Dado** o celular a 390 px
- **Quando** se abre Contatos
- **Então** a primeira linha da tabela aparece na primeira tela

### 12. Mesma margem e largura em todas as telas (B47-12)

#### CA-B47-29 — Um contêiner de página só · prova: automática

- **Dado** as páginas de `src/app/(auth)`
- **Quando** se confere o contêiner da página
- **Então** nenhuma monta o próprio contêiner centralizado, e todas usam o mesmo contêiner de página (`CLASSE_DA_PAGINA`), com a mesma largura e as mesmas margens; Chat, Pipeline e editor de automação ocupam a tela inteira

#### CA-B47-30 — Título no mesmo lugar ao navegar · prova: manual

- **Dado** o desktop a 1440 px
- **Quando** se passa por Catálogo, Contatos, Automações, Funis, Agenda e Nova campanha
- **Então** o título começa no mesmo ponto em todas, e Times, Catálogo e Agenda não deixam metade da tela vazia

### 13. Acabamentos (B47-13)

#### CA-B47-31 — Funil sem nome barrado no formulário · prova: automática

- **Dado** o formulário "Novo funil" com o nome vazio
- **Quando** se clica em Criar
- **Então** "Informe o nome do funil." aparece na hora, junto do campo, sem ir ao servidor

#### CA-B47-32 — Nova etiqueta com cor marcada · prova: automática

- **Dado** o formulário "Nova etiqueta"
- **Quando** ele abre
- **Então** a primeira cor já vem marcada, e Salvar sem nome diz "Dê um nome à etiqueta"

#### CA-B47-33 — Sem "workspace" no texto · prova: automática

- **Dado** os textos das telas
- **Quando** se procura "workspace" em texto visível
- **Então** não há nenhum; aparece "empresa"

#### CA-B47-34 — Acabamentos visuais aprovados · prova: manual

- **Dado** a empresa de teste no preview
- **Quando** o Luan confere: "Editar funil" sem quebra e aberto perto do botão; mensagens rápidas com o nome inteiro; campos do produto no mesmo fundo; a barra de Aparência sem cobrir texto; Dashboard sem barras zeradas; Carteiras em tabela; lista de contatos do follow-up recolhida; editor de automação novo com a dica do "+"; seção "Agenda" visível no seletor; cartões de etapa sem "0 cards" quebrado
- **Então** ele aprova cada um, ou o que não aprovar volta para a issue

### 14. Fuso do CRM configurável pela empresa (B47-14)

**Comportamentos:** a empresa tem um fuso, que começa em Brasília. Só o Admin
troca, em Configurações. Toda data e hora das telas da empresa usa esse fuso.

#### CA-B47-35 — Empresa nova começa no horário de Brasília · prova: automática

- **Dado** uma empresa sem fuso escolhido
- **Quando** uma tela formata a hora de um movimento feito às 18:00 UTC
- **Então** aparece "15:00"

#### CA-B47-36 — Admin troca o fuso e as telas seguem · prova: automática

- **Dado** a empresa no horário de Brasília
- **Quando** o Admin escolhe "Manaus (UTC−4)" e salva
- **Então** o mesmo movimento aparece com "14:00" para todos os usuários da empresa

#### CA-B47-37 — Só o Admin troca o fuso · prova: automática

- **Dado** um Gerente ou um Atendente da empresa
- **Quando** tenta salvar outro fuso
- **Então** o servidor recusa ("Sem permissão") e o fuso continua o mesmo

### 15. Ajuda onde falta explicação (B47-15)

**Comportamentos:** onde a tela usa um termo ou um botão sem dizer o que é,
aparece uma frase curta ou um "?" com a explicação. Decisão do Luan
(27/10/2026): descrição na tela ou ajuda com interrogação.

#### CA-B47-38 — Termos e botões explicados · prova: automática

- **Dado** as telas com termo ou botão sem explicação: funis "fixo" da Entrada e da Recompra (C-01), "ICP" e "Perfil RFV" na ficha do contato (C-13), "Tag" no card e "Etiqueta" na conversa (C-04), "Corrigir recebimento de mensagens" no WhatsApp (C-32), o código na importação de produtos (C-17), "Marcar como Fechado" e "Cancelar pedido" (C-20)
- **Quando** cada uma é desenhada
- **Então** cada termo ou botão tem ao lado uma frase curta ou um "?" que, aberto, diz o que é ou o que faz

#### CA-B47-39 — Ícones do campo de mensagem com nome · prova: automática

- **Dado** o campo de mensagem do Chat
- **Quando** é desenhado
- **Então** os botões de anexo, mensagens rápidas, nota interna e áudio têm nome visível em dica e nome acessível ("Mensagens rápidas", "Nota interna"…)

#### CA-B47-40 — Template rejeitado mostra o motivo · prova: automática

- **Dado** um template com status "Rejeitado" e o motivo devolvido pela Meta gravado
- **Quando** a lista de templates é desenhada
- **Então** o motivo aparece junto do status; sem motivo gravado, aparece "A Meta não informou o motivo"

#### CA-B47-41 — Tag sem espaço barrada na digitação · prova: automática

- **Dado** o campo "Nova tag" do card
- **Quando** se digita um espaço
- **Então** o espaço não entra e a dica diz "Tags não têm espaço"

### 16. Botões perigosos separados dos comuns (B47-16)

#### CA-B47-42 — Excluir e apagar de vez fora do caminho · prova: automática

- **Dado** o painel do card (C-07), a ficha do contato (C-15), a lixeira (C-36), as Carteiras (C-21) e o WhatsApp (C-31)
- **Quando** cada um é desenhado
- **Então** "Excluir", "Apagar de vez", "Remover da carteira" e "Remover número" ficam num menu "⋯" ou como botão secundário vermelho, separados dos botões comuns, e "Remover da carteira" pede confirmação

### 17. Atalhos entre telas (B47-17)

#### CA-B47-43 — Do chat para a ficha do contato · prova: automática

- **Dado** uma conversa aberta com contato cadastrado
- **Quando** se olha o cabeçalho
- **Então** o nome do contato é um link para `/contatos/<id>`

#### CA-B47-44 — Do pedido para a conversa · prova: automática

- **Dado** um pedido de contato que tem conversa
- **Quando** o pedido é aberto
- **Então** há "Abrir conversa" ao lado de "Perfil do contato", levando à conversa dele no Chat

### 18. Rótulos que dizem a mesma coisa do mesmo jeito (B47-18)

#### CA-B47-45 — Rótulos padronizados · prova: automática

- **Dado** as telas com rótulo confuso
- **Quando** cada uma é desenhada
- **Então** o menu e o Pipeline dizem "Funis" nos dois (C-02); Novo lead e Novo contato pedem nome e depois telefone, os dois com nome obrigatório (C-03); o catálogo publicado mostra "Tirar a loja do ar", e o fora do ar, "Publicar a loja" (C-18); os tipos de campo são "Uma opção" e "Várias opções" (C-26), com exemplo em cinza (C-27); o campo da mensagem rápida é "Atalho (digite / no chat)" (C-29); o X dos alertas é "Dispensar" (C-33); a faixa de filtros salvos se chama "Filtros salvos" e o menu dela diz "Editar" e "Apagar" (C-12); a campanha tem "Ver todos os N" na lista de destinatários (C-35)

### 19. Telas menos carregadas (B47-19)

#### CA-B47-46 — Filtros do Chat numa linha · prova: automática

- **Dado** a lista de conversas
- **Quando** é desenhada
- **Então** "Minhas / Meu time / Todas" e o status ficam no mesmo seletor, e as etiquetas atrás de um botão "Etiquetas" (C-10)

#### CA-B47-47 — Um Editar só na ficha · prova: automática

- **Dado** a ficha do contato
- **Quando** se clica em Editar
- **Então** os dados do contato e os campos personalizados ficam editáveis juntos, com um Salvar (C-14)

#### CA-B47-48 — Mover pelo painel mantém o painel aberto · prova: automática

- **Dado** o painel do card aberto
- **Quando** se move o card de etapa pela lista
- **Então** o painel continua aberto, com a etapa nova e o histórico atualizado (C-06)

#### CA-B47-49 — Alertas agrupados e filtro do Dashboard separado · prova: automática

- **Dado** 46 alertas de "Lead sem resposta" e o filtro "Todos os contatos" do Dashboard
- **Quando** as telas são desenhadas
- **Então** os alertas aparecem agrupados por tipo, com "ver mais", e o filtro do Dashboard separa os grupos de contato dos campos (C-34, C-22)

## Fora de escopo

- Dos achados de clareza, os que mudam o produto: editar as etapas da Entrada e da Recompra (C-01, só ganha a explicação), renomear "Tag" e "Etiqueta" (C-04, só ganha a explicação), um caminho só para Pedidos (C-16), a Agenda como calendário (C-24) e arrastar para ordenar funis e campos (C-28).
- O "Abrir conversa" do card sem conversa (C-05): a B45 decidiu que vai com a spec de começar conversa.
- O que o teste não cobriu (envio de mensagem, número de WhatsApp, pedido, planilha, campanha, convites).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-01 | O fuso de todas as telas é o da operação (`America/Sao_Paulo`, já em `src/lib/datas.ts`), para todas as empresas | confirmada | Brasília é o padrão. Luan, 27/10/2026, que pediu também uma configuração para trocar o fuso: fica na B47-14, separada desta |
| SUP-B47-02 | O follow-up pode ser editado e apagado por quem o criou, pelo atendente dele e por Admin e Gerente, como já é no adiar | invalidada | Por enquanto, todo usuário da empresa edita e apaga qualquer follow-up da empresa (CA-B47-14 reescrito). Luan, 27/10/2026 |
| SUP-B47-04 | O fuso é da empresa e só o Admin troca (B47-14). Era a recomendação, aceita junto com as outras | confirmada | Luan, 27/10/2026 ("pode levar em consideração as recomendações") |
| SUP-B47-03 | A variável pendente é inserida ao salvar, em vez de bloquear o Salvar (CA-B47-17) | confirmada | Luan, 27/10/2026 |
| SUP-B47-05 | Dashboard com o funil todo zerado mostra "Nenhum card neste funil ainda" e o link do Pipeline, em vez das barras vazias; com algum card, as barras continuam | confirmada | Luan, 28/10/2026 |
| SUP-B47-06 | A "Visão geral" das Carteiras vira tabela: Total, Com carteira e Sem carteira nas linhas; Sem compra, Base, Ativos e Inativos nas colunas | confirmada | Luan, 28/10/2026 |
| SUP-B47-07 | O Novo follow-up abre só com a busca; a lista de contatos aparece quando se digita | confirmada | Luan, 28/10/2026 |
| SUP-B47-08 | O "Editar funil" abre logo abaixo do funil clicado, na própria lista | confirmada | Luan, 28/10/2026 |
| SUP-B47-09 | O seletor de blocos fica mais largo, com os grupos em duas colunas, para "Agenda" aparecer sem rolar | confirmada | Luan, 28/10/2026 |
| SUP-B47-10 | Automação nova: enquanto só existe o gatilho, aparece "Clique no + embaixo do gatilho para escolher o próximo bloco" | confirmada | Luan, 28/10/2026 |
| SUP-B47-11 | Mensagens rápidas no Chat: nome inteiro em cima, texto embaixo cortado em uma linha | confirmada | Luan, 28/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B47-01 | A automação nova deve nascer desligada, com "Salvar e ativar" à parte? Hoje nasce ligada (B47-08) | respondida | Sim, nasce desligada. Luan, 27/10/2026 |
| PER-B47-02 | Que nome dar aos contatos sem compra nas Carteiras, para não confundir com os "Leads" do Pipeline? Sugestão: "Sem compra" (B47-10) | respondida | "Sem compra". Luan, 27/10/2026 |
| PER-B47-03 | O termo do canal direto (versionado: mudar o texto pede novo aceite), a Política de Privacidade e os Termos de Serviço também trocam "workspace" por "empresa"? | respondida | Não, os três ficam como estão; o teste do CA-B47-33 os ignora, com o motivo escrito. Luan, 28/10/2026 |
