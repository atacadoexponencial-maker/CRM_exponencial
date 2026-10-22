# Spec: Bloco "esperar" nas automações e fim das sequências

> série: B28
> estado: aprovada em 20/10/2026

## Visão Geral

Pedido do Luan em 20/10/2026, em três partes:

1. **Bloco "esperar" no fluxo das automações.** Um bloco novo que segura o
   contato no meio do fluxo e só segue quando algo acontece. O admin liga de uma
   a três opções, e cada opção ligada vira uma saída do bloco, com o seu caminho:
   - **tempo:** passou o tempo escolhido (segundos, minutos, horas ou dias);
   - **recebeu mensagem:** o contato mandou mensagem;
   - **atendente enviou:** alguém do time mandou mensagem para o contato.

   É uma corrida: o que acontecer primeiro leva o contato pela saída dele, e as
   outras saídas deixam de valer para aquela execução. Com só o tempo ligado, o
   bloco é uma pausa simples.
2. **Fim das sequências (Módulo 4).** Com o bloco "esperar", uma automação faz o
   que uma sequência fazia (mensagem, espera de dias, mensagem). Manter as duas
   coisas é redundante. A tela de sequências, os inícios automáticos e manuais e a
   ação "iniciar sequência" saem.
3. **Ação "criar lembrete na Agenda".** A única coisa que a sequência fazia e a
   automação não fazia era a etapa de lembrete: criar uma tarefa na Agenda do
   vendedor. Ela vira uma ação da automação, para não se perder com o fim das
   sequências.

Levantamento no banco em 20/10/2026, só leitura: as 5 empresas têm 0 sequências,
0 execuções de sequência e 0 lembretes, e nenhuma das 3 automações usa "iniciar
sequência". O fim das sequências não apaga dado de nenhuma empresa.

Para quem: o admin, que monta as automações; o atendente, que recebe os
lembretes na Agenda.

## Páginas / Módulos

### Bloco "esperar" no editor

**Descrição:** o admin põe o bloco no fluxo, escolhe as opções e liga um caminho
a cada saída.

**Componentes:**
- Item "Esperar" no menu de novo bloco, ao lado de condição e ação.
- Painel do bloco: três opções para ligar ou desligar (tempo, recebeu mensagem,
  atendente enviou). Na opção de tempo, um número e a unidade (segundos, minutos,
  horas, dias).
- Sem o tempo ligado, a escolha do limite: "esperar no máximo 30 dias" ou
  "esperar sem limite".
- Uma saída no bloco para cada opção ligada, com o nome dela ("Depois de 2 dias",
  "Recebeu mensagem", "Atendente enviou").

**Comportamentos:**
- Pôr o bloco: o bloco nasce com o tempo ligado (1 dia) e as outras duas opções
  desligadas.
- Ligar uma opção: aparece a saída dela no bloco.
- Desligar uma opção: a saída some, e a ligação que saía dela é apagada.
- Desligar a última opção ligada: não deixa, porque o bloco precisa de pelo menos
  uma.
- Escolher o tempo: número inteiro de 1 até o equivalente a 365 dias.
- Escolher o limite, quando o tempo está desligado.
- Salvar com a configuração incompleta (tempo sem número): o editor aponta a
  pendência no bloco, como faz com os outros.
- Ligar uma saída a um bloco anterior: continua recusado, como hoje (sem laços).

**Critérios de aceite:**

#### CA-B28-01 — o bloco "esperar" aparece no menu e nasce com o tempo ligado · prova: automática

- **Dado** o editor de uma automação aberto
- **Quando** o admin escolhe "Esperar" no menu de novo bloco
- **Então** o bloco aparece com a opção de tempo ligada (1 dia), as outras duas
  desligadas e uma saída só, "Depois de 1 dia"

#### CA-B28-02 — cada opção ligada vira uma saída, e desligar apaga a ligação dela · prova: automática

- **Dado** um bloco "esperar" com o tempo e "recebeu mensagem" ligados, e a saída
  "Recebeu mensagem" ligada a uma ação
- **Quando** o admin desliga "recebeu mensagem"
- **Então** o bloco fica com uma saída só, a do tempo, e a ligação para a ação
  some

#### CA-B28-03 — o bloco não fica sem nenhuma opção · prova: automática

- **Dado** um bloco "esperar" com só o tempo ligado
- **Quando** o admin tenta desligar o tempo
- **Então** a opção continua ligada e o painel avisa que o bloco precisa de pelo
  menos uma opção

#### CA-B28-04 — tempo fora do intervalo não salva · prova: automática

- **Dado** um bloco "esperar" com o tempo ligado
- **Quando** o tempo está vazio, é zero, não é inteiro ou passa de 365 dias
- **Então** o Salvar recusa, com a pendência apontada no bloco; o servidor recusa
  o mesmo fluxo se ele chegar por fora do editor

#### CA-B28-05 — sem o tempo, o admin escolhe entre o teto de 30 dias e sem limite · prova: automática

- **Dado** um bloco "esperar" com "recebeu mensagem" ligado e o tempo desligado
- **Quando** o admin abre o painel do bloco
- **Então** ele escolhe "esperar no máximo 30 dias" ou "esperar sem limite", e o
  bloco nasce com o teto de 30 dias marcado

### Motor: o contato esperando no bloco

**Descrição:** quando o caminho chega num bloco "esperar", a execução para ali e
fica guardada. Ela continua do mesmo ponto quando a primeira das opções ligadas
acontece.

**Comportamentos:**
- Chegar no bloco: as ações anteriores já rodaram; a execução fica "esperando",
  com a hora em que começou a esperar.
- Tempo: passado o tempo, a execução segue pela saída do tempo. A precisão é de
  até 30 segundos depois da hora certa.
- Recebeu mensagem: a primeira mensagem do contato, na conversa dele, que chega depois de ele entrar
  no bloco faz a execução seguir pela saída "Recebeu mensagem". A mensagem que
  disparou a regra não conta.
- Atendente enviou: a primeira mensagem que alguém do time manda para o contato
  depois de ele entrar no bloco (pelo chat ou pelo celular) faz a execução seguir
  pela saída "Atendente enviou". Mensagem mandada por automação ou campanha não
  conta, como no gatilho "mensagem enviada pelo time".
- O que acontece primeiro vale; o resto é ignorado para aquela execução.
- Depois da saída "Recebeu mensagem" ou "Atendente enviou", as condições sobre a
  mensagem ("texto contém", "tipo da mensagem") olham a mensagem que acabou a
  espera, em qualquer gatilho (decisão do Luan em 20/10).
- Saída sem ligação: a execução termina ali, como em qualquer bloco.
- Teto de 30 dias sem nada acontecer: a execução termina sem seguir, e o
  histórico diz que a espera expirou.
- Sem limite: a execução fica esperando até a mensagem chegar.
- Um fluxo pode ter mais de um bloco "esperar" no mesmo caminho.
- A mensagem que acaba a espera continua disparando as outras regras da empresa
  normalmente.
- Contato que vai para a lixeira: as esperas dele são canceladas.

**Critérios de aceite:**

#### CA-B28-06 — as ações antes do bloco rodam, e as de depois esperam · prova: automática

- **Dado** um fluxo gatilho → ação A → esperar 1 hora → ação B
- **Quando** o gatilho dispara para o contato
- **Então** a ação A roda na hora, a ação B não roda, e o histórico mostra a
  execução como "esperando" no bloco, desde a hora do disparo

#### CA-B28-07 — passado o tempo, o caminho segue pela saída do tempo · prova: automática

- **Dado** um contato esperando há 1 hora num bloco "esperar 1 hora"
- **Quando** o relógio do motor roda
- **Então** a ação ligada à saída do tempo roda e o histórico mostra a execução
  concluída, com o caminho inteiro

#### CA-B28-08 — a pausa curta segue em até 30 segundos depois da hora · prova: manual

- **Dado** uma regra com "esperar 1 minuto" entre duas mensagens, no número de
  teste conectado
- **Quando** o gatilho dispara
- **Então** a segunda mensagem é entregue ao gateway entre 1 minuto e 1 minuto e
  30 segundos depois da primeira

#### CA-B28-09 — a resposta do contato leva pela saída "Recebeu mensagem" · prova: automática

- **Dado** um contato esperando num bloco com o tempo (2 dias) e "recebeu
  mensagem" ligados
- **Quando** o contato manda uma mensagem
- **Então** a execução segue pela saída "Recebeu mensagem" na mesma hora, enquanto mensagem de outro contato não muda nada, e a
  saída do tempo não roda mais para essa execução, nem depois dos 2 dias

#### CA-B28-10 — a mensagem do time leva pela saída "Atendente enviou" · prova: automática

- **Dado** um contato esperando num bloco com "atendente enviou" ligado
- **Quando** um atendente manda mensagem para ele pelo chat
- **Então** a execução segue pela saída "Atendente enviou"

#### CA-B28-11 — mensagem de automação ou de campanha não acaba a espera · prova: automática

- **Dado** um contato esperando num bloco com "atendente enviou" ligado
- **Quando** outra automação ou uma campanha manda mensagem para ele
- **Então** ele continua esperando

#### CA-B28-12 — a mensagem que disparou a regra não acaba a espera · prova: automática

- **Dado** uma regra de gatilho "mensagem recebida" → esperar com "recebeu
  mensagem" ligado
- **Quando** o contato manda a mensagem que dispara a regra
- **Então** ele fica esperando, e só a mensagem seguinte faz o caminho seguir

#### CA-B28-13 — a condição depois da espera olha a mensagem nova · prova: automática

- **Dado** uma regra de gatilho "card movido" → esperar ("recebeu mensagem") →
  condição "texto contém sim"
- **Quando** o contato responde "sim, pode mandar"
- **Então** a condição sai pelo "sim"; o editor aceita a condição de mensagem
  nesse ponto do fluxo e continua recusando antes da espera

#### CA-B28-14 — 30 dias sem nada, a espera expira · prova: automática

- **Dado** um contato esperando há 30 dias num bloco sem tempo, com o teto de 30
  dias
- **Quando** o relógio do motor roda
- **Então** a execução termina sem seguir caminho e o histórico mostra "a espera
  expirou depois de 30 dias"

#### CA-B28-15 — sem limite, a espera não expira · prova: automática

- **Dado** um contato esperando há 31 dias num bloco sem tempo e "sem limite"
- **Quando** o relógio do motor roda
- **Então** ele continua esperando

#### CA-B28-16 — contato na lixeira tem as esperas canceladas · prova: automática

- **Dado** um contato esperando numa regra
- **Quando** ele vai para a lixeira
- **Então** a execução é cancelada e nenhuma ação dela roda depois

### Regras e esperas

**Descrição:** como o bloco "esperar" convive com a proteção de repetição e com
as mudanças na regra.

**Comportamentos:**
- Contato esperando numa regra não começa a mesma regra de novo, qualquer que
  seja a repetição dela (decisão do Luan em 20/10). Ele pode estar em regras
  diferentes ao mesmo tempo.
- Desativar a regra cancela as esperas dela.
- Excluir a regra cancela as esperas dela.
- Editar e salvar: quem espera num bloco que continua no fluxo segue esperando, e
  depois segue o fluxo novo. Quem espera num bloco que foi apagado tem a espera
  cancelada.
- Antes de salvar uma edição que apaga um bloco com contatos esperando, desativar
  ou excluir, o admin vê quantos contatos estão esperando e confirma.

**Critérios de aceite:**

#### CA-B28-17 — contato esperando não recomeça a mesma regra · prova: automática

- **Dado** uma regra de repetição "sempre" e um contato esperando nela
- **Quando** o gatilho dela dispara de novo para ele
- **Então** a regra não recomeça, e o histórico mostra "ignorada: o contato já
  está esperando nesta regra"

#### CA-B28-18 — desativar ou excluir cancela as esperas, depois de confirmar · prova: automática

- **Dado** uma regra com 2 contatos esperando
- **Quando** o admin desativa ou exclui a regra e confirma o aviso "2 contatos
  estão esperando nesta regra"
- **Então** as duas execuções ficam canceladas no histórico ("regra desativada"
  ou "regra excluída") e nenhuma ação delas roda depois

#### CA-B28-19 — editar mantém quem espera num bloco que continua · prova: automática

- **Dado** um contato esperando num bloco "esperar" de uma regra
- **Quando** o admin troca a ação depois do bloco e salva
- **Então** o contato continua esperando e, quando a espera acaba, roda a ação
  nova

#### CA-B28-20 — editar cancela quem espera num bloco apagado · prova: automática

- **Dado** um contato esperando num bloco "esperar"
- **Quando** o admin apaga esse bloco, confirma o aviso e salva
- **Então** a execução fica cancelada no histórico ("o bloco de espera saiu da
  regra")

### Histórico e "Testar"

**Descrição:** o histórico mostra quem está esperando; o "Testar com um contato"
mostra até onde o contato iria.

**Comportamentos:**
- A execução esperando aparece no histórico como "Esperando", com o bloco, o que
  ela espera e desde quando.
- Quando a espera acaba, a mesma execução continua: o histórico mostra o caminho
  inteiro, com a saída que o bloco tomou e a hora.
- O filtro de resultado do histórico ganha "Esperando" e "Cancelada".
- O "Testar" percorre o fluxo até o bloco "esperar" e para ali, mostrando o que o
  contato esperaria; não segue por nenhuma saída.

**Critérios de aceite:**

#### CA-B28-21 — o histórico mostra a execução esperando e, depois, o caminho inteiro · prova: automática

- **Dado** uma execução que esperou num bloco e seguiu pela saída "Recebeu
  mensagem"
- **Quando** o admin abre o histórico
- **Então** enquanto esperava, a linha dizia "Esperando: recebeu mensagem ou 2
  dias, desde 14:03"; depois, a mesma linha mostra o caminho inteiro, com "Saiu
  por: recebeu mensagem, às 15:20"

#### CA-B28-22 — o histórico filtra por "Esperando" e "Cancelada" · prova: automática

- **Dado** execuções concluídas, esperando e canceladas
- **Quando** o admin filtra por "Esperando"
- **Então** só aparecem as que estão esperando

#### CA-B28-23 — o "Testar" para no bloco de espera · prova: automática

- **Dado** um fluxo com uma ação, um bloco "esperar" e outra ação
- **Quando** o admin testa com um contato
- **Então** o caminho mostra a primeira ação e o bloco "esperar", com a nota "aqui
  o contato esperaria", e não mostra a segunda ação

### Relógio do motor (gateway)

**Descrição:** quem acorda as esperas de tempo é o whatsapp-gateway, que já roda o
tempo todo. A cada 15 segundos ele chama o CRM, que segue as esperas vencidas.
Decisão do Luan em 20/10: os crons do projeto são diários (plano Hobby da
Vercel), e o gateway já tem relógios próprios.

**Comportamentos:**
- O CRM só aceita a chamada do relógio com o segredo combinado.
- Duas chamadas ao mesmo tempo não seguem a mesma espera duas vezes.
- Gateway fora do ar: as esperas de tempo atrasam e seguem quando ele volta; as
  de mensagem não dependem dele.
- No preview da Vercel, o relógio não chega (o gateway chama a produção); os
  testes chamam a rota na mão.

**Critérios de aceite:**

#### CA-B28-24 — o relógio sem o segredo é recusado · prova: automática

- **Dado** a rota do relógio
- **Quando** ela é chamada sem o segredo, ou com outro
- **Então** responde "não autorizado" e nenhuma espera segue

#### CA-B28-25 — duas chamadas juntas não seguem a mesma espera duas vezes · prova: automática

- **Dado** uma espera vencida
- **Quando** o relógio é chamado duas vezes ao mesmo tempo
- **Então** a ação depois da espera roda uma vez só

#### CA-B28-26 — o gateway chama o relógio a cada 15 segundos · prova: automática

- **Dado** o gateway configurado com o endereço e o segredo do relógio
- **Quando** ele está no ar
- **Então** chama o relógio do CRM a cada 15 segundos, e uma chamada que falha não
  para as seguintes (issue no repositório do gateway, série A11)

### Ação "criar lembrete na Agenda"

**Descrição:** a ação cria um lembrete na Agenda, como a etapa de lembrete das
sequências fazia.

**Componentes:**
- Ação "Criar lembrete na Agenda" no menu de ações.
- Painel: o texto do lembrete (com as variáveis de mensagem, como o nome do
  contato), para quem (o responsável pela conversa do contato, ou uma pessoa
  escolhida) e quando vence (na hora, ou depois de um número de horas ou dias).

**Comportamentos:**
- Rodar a ação: o lembrete aparece na Agenda da pessoa, com o contato, o texto e o
  vencimento.
- "Responsável pela conversa" sem responsável: o lembrete vai para o primeiro
  admin ativo, como a sequência fazia.
- Pessoa escolhida desativada ou fora da empresa: a ação falha, com o motivo no
  histórico.
- Na Agenda, o lembrete aparece como "Lembrete de automação", com o nome da regra.
- Marcar feito, adiar e reatribuir funcionam como nos lembretes avulsos.

**Critérios de aceite:**

#### CA-B28-27 — a ação cria o lembrete na Agenda do responsável · prova: automática

- **Dado** um contato com conversa atribuída à Ana, e uma regra com "criar lembrete
  na Agenda" (texto "Ligar para {{nome_contato}}", para o responsável, vence em 2
  dias)
- **Quando** a regra roda
- **Então** a Agenda da Ana mostra "Ligar para Bruno", vencendo daqui a 2 dias,
  marcado como "Lembrete de automação"

#### CA-B28-28 — sem responsável, o lembrete vai para o primeiro admin ativo · prova: automática

- **Dado** um contato sem conversa atribuída
- **Quando** a regra com "para o responsável" roda
- **Então** o lembrete vai para o primeiro admin ativo da empresa

#### CA-B28-29 — pessoa escolhida desativada faz a ação falhar com o motivo · prova: automática

- **Dado** uma regra com o lembrete para uma pessoa que foi desativada
- **Quando** a regra roda
- **Então** a ação falha e o histórico diz "a pessoa escolhida está desativada"

#### CA-B28-30 — o lembrete de automação se marca, adia e reatribui como os outros · prova: automática

- **Dado** um lembrete criado por automação na Agenda
- **Quando** a pessoa marca feito, adia 1 dia ou o gerente reatribui
- **Então** a Agenda mostra o mesmo resultado que mostra para um lembrete avulso

### Fim das sequências

**Descrição:** o Módulo 4 perde as sequências. A Agenda e a central de alertas
continuam.

**Comportamentos:**
- O menu não mostra mais "Sequências"; o endereço `/sequencias` leva para as
  automações.
- Arrastar o card para Ganho, Catálogo Enviado ou Inativos não inicia mais
  sequência. Quem quiser isso cria uma automação com o gatilho "card movido".
- A ação "mover card" das automações perde a opção "iniciar a sequência da etapa".
- A ação "iniciar sequência" sai do menu de ações.
- O botão "Iniciar sequência" sai do card do funil, do perfil do contato e da
  central de alertas (decisão do Luan em 20/10).
- A Agenda da equipe perde o quadro "sequências em andamento".
- A empresa nova não ganha mais as quatro sequências prontas.
- O cron diário das sequências sai.
- Regra salva antes, com "iniciar sequência", não roda essa ação: o histórico diz
  que a ação foi removida, e o editor pede para trocar. Hoje nenhuma regra tem.
- As tabelas das sequências ficam no banco até o merge e saem depois, numa etapa
  separada, com o ok do Luan (o banco é um só para produção e preview).

**Critérios de aceite:**

#### CA-B28-31 — o menu e as telas não falam mais em sequência · prova: automática

- **Dado** um admin logado
- **Quando** ele abre o menu, o card do funil, o perfil do contato, a central de
  alertas e a Agenda da equipe
- **Então** nenhum deles mostra "Sequências" nem "Iniciar sequência", e abrir
  `/sequencias` leva para as automações

#### CA-B28-32 — arrastar o card não inicia sequência · prova: automática

- **Dado** um card no Funil de Entrada
- **Quando** o atendente o arrasta para Catálogo Enviado ou para Ganho
- **Então** nenhuma execução de sequência é criada, e as automações de "card
  movido" rodam como antes

#### CA-B28-33 — as ações de sequência saem do editor · prova: automática

- **Dado** o editor de automação
- **Quando** o admin abre o menu de ações e o painel do "mover card"
- **Então** não há "iniciar sequência" nem a opção "iniciar a sequência da etapa"

#### CA-B28-34 — regra antiga com "iniciar sequência" avisa em vez de rodar · prova: automática

- **Dado** uma regra gravada com a ação "iniciar sequência"
- **Quando** ela dispara
- **Então** essa ação falha com "a ação 'iniciar sequência' foi removida: troque
  no editor", as outras ações rodam, e o editor aponta a pendência no bloco

#### CA-B28-35 — empresa nova não ganha sequências · prova: automática

- **Dado** o cadastro de uma empresa nova
- **Quando** ela é criada
- **Então** nenhuma sequência é criada para ela

#### CA-B28-36 — as tabelas de sequência saem do banco depois do merge · prova: manual

- **Dado** o branch no ar há pelo menos um dia, sem erro
- **Quando** o Luan aprova
- **Então** a migration apaga as tabelas de sequência, e a suíte, o build e os
  roteiros passam de novo

### Testes da Agenda (QA)

**Descrição:** o Luan pediu um teste da área de tarefas, que é a Agenda, e das
automações que mexem nela. Hoje elas são a etapa de lembrete das sequências, que
sai nesta spec; no lugar dela entra a ação "criar lembrete na Agenda".

**Critérios de aceite:**

#### CA-B28-37 — roteiro do preview passa pela Agenda inteira · prova: automática

- **Dado** a empresa de teste no preview do branch
- **Quando** o roteiro roda
- **Então** passam: criar follow-up, vê-lo na Minha Agenda, marcar feito, adiar,
  atrasado com o selo no menu, Agenda da equipe com filtro por pessoa,
  reatribuir, e o lembrete criado pela automação

## Fora de escopo

- Laços no fluxo (ex.: "lembra a cada 2 dias até responder"). Continuam
  recusados.
- Esperar outros eventos (card movido, tag adicionada, lembrete feito).
- Esperar até um horário do dia ou até o horário comercial.
- Caminhos em paralelo.
- Cancelar à mão uma espera de um contato só, pelo histórico.
- Gatilho de "início manual" no lugar do botão "Iniciar sequência".
- Modelos de automação prontos no lugar das quatro sequências prontas.
- Parar a espera de tempo quando o gateway cai: as esperas atrasam e seguem quando
  ele volta, sem aviso.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-01 | O tempo de espera vai até 365 dias, o mesmo teto da repetição "a cada N horas". | confirmada | Luan, 20/10/2026: "acho que tá bom". |
| SUP-B28-02 | As duas saídas de mensagem só valem para mensagem na conversa do próprio contato; mensagem trocada com outro contato nunca encerra a espera dele. | confirmada | Luan, 20/10/2026 (a suposição dizia "qualquer conversa dele na empresa, de qualquer número conectado"; ele ajustou para a conversa do próprio contato). |
| SUP-B28-03 | Quando a mensagem acaba a espera e também dispara outras regras, a espera segue primeiro e as regras do evento rodam depois, na fila do contato. | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |
| SUP-B28-04 | A ação "criar lembrete na Agenda" tem as opções: texto com variáveis, para quem (responsável pela conversa ou pessoa escolhida) e vencimento (na hora, ou depois de N horas ou dias). Sem responsável, vai para o primeiro admin ativo, como a sequência fazia. | confirmada | Luan, 20/10/2026: o padrão do bloco é o responsável pela conversa, e dá para escolher outra pessoa. |
| SUP-B28-05 | A precisão de 30 segundos (CA-B28-08) vale com o gateway no ar e conta até o CRM entregar a mensagem ao gateway, que segura os envios na fila dele (como decidido na B11-09). | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |
| SUP-B28-06 | Um bloco "esperar" conta como bloco no limite de 100 blocos por automação, e ele sozinho não basta: o fluxo continua precisando de pelo menos uma ação. | confirmada | Luan aprovou a spec sem mudança neste ponto, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-01 | Como o bloco escolhe o caminho? | respondida | Corrida: o admin liga de 1 a 3 opções, e a primeira que acontece leva pela saída dela (Luan, 20/10/2026). |
| PER-B28-02 | Sem o tempo, até quando o contato espera mensagem? | respondida | O admin escolhe: teto de 30 dias ou sem limite (Luan, 20/10/2026). |
| PER-B28-03 | Quem acorda as esperas de tempo? | respondida | O whatsapp-gateway, a cada 15 segundos (Luan, 20/10/2026). Descartados: Vercel Pro (US$ 20/mês, 1 por minuto) e serviço externo de cron (mais uma conta para manter). |
| PER-B28-04 | O que é a "área de tarefas"? | respondida | A Agenda; a automação ganha "criar lembrete na Agenda" para substituir a etapa de lembrete das sequências (Luan, 20/10/2026). |
| PER-B28-05 | Contato esperando numa regra pode começá-la de novo? | respondida | Não, enquanto espera (Luan, 20/10/2026). |
| PER-B28-06 | O que acontece com quem espera quando a regra muda? | respondida | Desativar e excluir cancelam; editar mantém quem espera num bloco que continua (Luan, 20/10/2026). |
| PER-B28-07 | Depois da saída de mensagem, as condições de mensagem olham a mensagem nova? | respondida | Sim, em qualquer gatilho (Luan, 20/10/2026). |
| PER-B28-08 | O que fica no lugar do botão "Iniciar sequência"? | respondida | Nada: o botão sai (Luan, 20/10/2026). |
