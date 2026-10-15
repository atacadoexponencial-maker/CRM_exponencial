# Spec: Mensagem na fila do número e aviso de aquecimento (canal direto)

> série: B26
> estado: aprovada em 15/10/2026

## Visão Geral

No canal direto, nenhuma mensagem sai na hora: toda mensagem entra na fila do número, e a
fila respeita o intervalo entre envios, o horário de envio, os tetos por hora e por dia
e o **aquecimento**. Número recém-conectado manda pouco: nos três primeiros dias, até 4
mensagens por hora e 30 por dia.

Hoje o CRM mostra a mensagem como enviada (✓) no instante em que a fila a aceita. Se ela
fica parada por causa do limite, ninguém fica sabendo. Em 15/10/2026, duas mensagens de
automação ficaram mais de 20 minutos na fila, com ✓ no CRM, sem chegar ao celular do
cliente.

Esta mudança faz o CRM mostrar a mensagem **na fila do número** até o envio de fato,
corrige a atualização do status da mensagem recém-enviada (hoje o ✓ só vira ✓✓ depois de
recarregar a tela) e avisa, ao montar uma campanha, que o número escolhido está em
aquecimento e quanto ele consegue mandar.

É para quem atende e quem dispara campanha por número do canal direto. A API Oficial não
tem fila no CRM e não muda.

## Páginas / Módulos

### Chat: mensagem na fila do número

**Descrição:** a mensagem enviada por um número do canal direto aparece com um relógio e
o texto "Na fila do número" enquanto não sai. Quando o número a envia, o relógio vira ✓
sem recarregar a tela.

**Componentes:**
- Indicador de status da mensagem de saída: relógio com "Na fila do número" enquanto
  espera a vez; ✓ enviada; ✓✓ entregue; ✓✓ azul lida; alerta em falha.

**Comportamentos:**
- Enviar texto pelo chat por um número do canal direto e ver a mensagem com o relógio.
- Enviar foto, áudio, vídeo ou documento pelo chat e ver o relógio do mesmo jeito.
- Ver o relógio virar ✓ quando a mensagem sai, sem recarregar.
- Ver o ✓ virar ✓✓ quando o cliente recebe, e ✓✓ azul quando lê, sem recarregar.
- Ver, ao abrir uma conversa, quais mensagens ainda estão na fila.
- Ver a mensagem enviada por automação ou sequência com o relógio enquanto espera.
- Enviar por um número da API Oficial e ver a mensagem como hoje, sem relógio.

**Critérios de aceite:**

#### CA-B26-01 — Mensagem aceita pela fila aparece "Na fila do número" · prova: automática

- **Dado** uma conversa de um número do canal direto
- **Quando** o atendente envia um texto pelo chat e o número o aceita na fila
- **Então** a mensagem aparece com o relógio e "Na fila do número", e não com ✓

#### CA-B26-02 — Mídia enviada também aparece na fila · prova: automática

- **Dado** uma conversa de um número do canal direto
- **Quando** o atendente envia uma foto, um áudio, um vídeo ou um documento
- **Então** a mensagem aparece com o relógio e "Na fila do número"

#### CA-B26-03 — Mensagem de automação e de sequência também aparece na fila · prova: automática

- **Dado** uma regra de automação ou uma sequência que envia mensagem por número do canal
  direto
- **Quando** a mensagem é aceita na fila
- **Então** ela fica gravada como na fila, e quem abre a conversa vê o relógio

#### CA-B26-04 — O relógio vira ✓ quando a mensagem sai, sem recarregar · prova: automática

- **Dado** uma mensagem na fila, exibida na conversa aberta
- **Quando** o número avisa que a enviou
- **Então** o relógio vira ✓ na tela, sem recarregar

#### CA-B26-05 — Mensagem recém-enviada atualiza para entregue e lida sem recarregar · prova: automática

- **Dado** uma mensagem que o atendente acabou de enviar, ainda na tela em que enviou
- **Quando** chegam os avisos de entregue e de lida
- **Então** a mensagem mostra ✓✓ e depois ✓✓ azul, sem recarregar. Vale nos dois canais.

#### CA-B26-06 — Aviso de envio que chega antes da mensagem gravada não se perde · prova: automática

- **Dado** uma mensagem que o número enviou tão rápido que o aviso de envio chegou antes de
  o CRM terminar de gravá-la
- **Quando** o CRM recebe esse aviso
- **Então** o aviso não é perdido: o CRM pede que ele seja reenviado, e a mensagem termina
  com o status certo, sem ficar presa em "Na fila do número"

#### CA-B26-07 — API Oficial continua como hoje · prova: automática

- **Dado** uma conversa de um número da API Oficial
- **Quando** o atendente envia uma mensagem
- **Então** ela aparece com ✓, sem relógio

#### CA-B26-08 — Fila parada pelo aquecimento, com chip real · prova: manual

- **Dado** um número do canal direto conectado há menos de três dias, com as 4 vagas da
  hora usadas
- **Quando** o atendente envia mais uma mensagem
- **Então** ela fica com o relógio até a vaga abrir, e vira ✓ sozinha quando sai e chega
  ao celular do cliente

### Campanhas: aviso de aquecimento na escolha do número

**Descrição:** ao escolher, na campanha, um número do canal direto que está em
aquecimento, o CRM avisa em que dia do aquecimento ele está e quantas mensagens consegue
mandar por hora e por dia. A estimativa de duração do disparo já considera esses limites.
O aviso explica por que ela é longa.

**Componentes:**
- Faixa de aquecimento, junto ao aviso de risco do canal direto, na etapa de escolha do
  número: "Número em aquecimento (dia N): até X mensagens por hora e Y por dia. Os
  limites sobem sozinhos até o dia 30."

**Comportamentos:**
- Escolher um número do canal direto em aquecimento e ver a faixa.
- Escolher um número do canal direto fora do aquecimento e não ver a faixa.
- Escolher um número da API Oficial e não ver a faixa.
- Trocar de número na mesma etapa e ver a faixa acompanhar a escolha.

**Critérios de aceite:**

#### CA-B26-09 — Número em aquecimento mostra a faixa com dia e limites · prova: automática

- **Dado** um número do canal direto conectado há 2 dias
- **Quando** o Admin o escolhe na campanha
- **Então** aparece a faixa "Número em aquecimento (dia 2): até 4 mensagens por hora e 30
  por dia", com os valores que o número de fato usa

#### CA-B26-10 — Número fora do aquecimento ou da API Oficial não mostra a faixa · prova: automática

- **Dado** um número do canal direto conectado há mais de 30 dias, e um número da API
  Oficial
- **Quando** o Admin escolhe cada um na campanha
- **Então** a faixa de aquecimento não aparece para nenhum dos dois

#### CA-B26-11 — Sem resposta do número, a campanha não inventa aquecimento · prova: automática

- **Dado** um número do canal direto cujo estado o CRM não consegue ler naquele momento
- **Quando** o Admin o escolhe na campanha
- **Então** a faixa não aparece, e o aviso de risco e a estimativa aparecem como hoje
  (estimativa marcada como aproximada)

## Fora de escopo

- Hora prevista de saída de cada mensagem. A previsão do gateway hoje ignora tetos e
  aquecimento. Fica como melhoria do gateway, em spec própria.
- Faixa de aquecimento no chat e no editor de automações. Decisão de 15/10/2026: só em
  Campanhas.
- Mudar os limites do aquecimento ou do ritmo.
- API Oficial.
- Cancelar ou reordenar mensagem na fila.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B26-01 | O número sempre avisa o CRM quando uma mensagem sai da fila ("enviada"), além de entregue e lida. Hoje o CRM já entende esse aviso. | confirmada | Marcelle, 15/10/2026. Conferido no /plan: o gateway publica \"sent\" a cada envio da fila, e o CRM o traduz para \"enviado\". |
| SUP-B26-02 | Pedir o reenvio do aviso de envio, quando a mensagem ainda não está gravada, faz o número reenviar em poucos segundos. O pedido vale só para avisos recentes (até 2 minutos), para não pedir reenvio para sempre de mensagem que o CRM nunca gravou. | invalidada | /plan da B26-02 (15/10/2026): a reentrega do gateway espera 1, 2, 4… minutos, não segundos. Substituída pela SUP-B26-05. |
| SUP-B26-03 | Campanha grava a mensagem na conversa como o chat grava, e por isso ganha o relógio e a correção da CA-B26-05 sem tratamento à parte. | invalidada | /plan da B26-02 (15/10/2026): a campanha não grava mensagem na conversa, só o destinatário, e ali já usa \"na_fila\" no canal direto (`src/lib/campanhas.ts`). Campanha fica fora da B26-02. |
| SUP-B26-04 | O dia do aquecimento e os limites daquela faixa podem ser lidos do número na hora de escolher, pelo mesmo caminho que a estimativa de duração já usa. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B26-05 | Na corrida rara (aviso de envio antes de a mensagem estar gravada), o CRM pede reentrega e o gateway reenvia em 1 minuto; nesse minuto, os outros avisos daquele contato esperam. O CRM só pede reentrega para aviso de até 5 minutos; mais velho que isso, aceita e descarta. | confirmada | Marcelle, 15/10/2026. |
| SUP-B26-06 | Enquanto a ação de envio não responde, a mensagem nova fica sem ícone de status (hoje aparece ✓ de imediato). Na resposta, ganha o relógio (canal direto) ou ✓ (API Oficial). Evita mostrar ✓ e logo trocar pelo relógio. | confirmada | Marcelle, 15/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B26-01 | Onde a faixa de aquecimento aparece? | respondida | Só em Campanhas, na escolha do número. Marcelle, 15/10/2026. |
| PER-B26-02 | Quando a faixa aparece? | respondida | Durante todo o aquecimento (dia 1 ao 30), com o dia e os limites. Marcelle, 15/10/2026. |
| PER-B26-03 | Mostrar a hora prevista de saída de cada mensagem? | respondida | Não agora: a previsão do gateway é imprecisa. Fica para spec do gateway. Marcelle, 15/10/2026. |
