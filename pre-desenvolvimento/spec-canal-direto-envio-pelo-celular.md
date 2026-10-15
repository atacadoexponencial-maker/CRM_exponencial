# Spec: Mensagem enviada pelo celular aparece no CRM (canal direto)

> série: B25
> estado: aprovada em 15/10/2026

## Visão Geral

No canal direto (número conectado ao CRM pelo gateway próprio, lendo o QR Code), o
vendedor continua com o WhatsApp no celular. Hoje, o que ele responde pelo celular, ou
por um aparelho conectado ao celular, como o WhatsApp Web, **nunca chega ao CRM**: o
gateway descarta toda mensagem que sai do próprio número. A conversa no CRM fica com
buracos. O cliente respondeu a uma pergunta que o CRM não mostra, e quem abre o chat
acha que ninguém falou com ele.

Esta mudança faz o gateway avisar o CRM de cada mensagem enviada pelo celular, e o CRM
mostrá-la na conversa como enviada pela empresa, com a marca "Enviada pelo celular". A
mensagem vale como resposta do time, como se tivesse saído pelo CRM. O que o próprio CRM
envia continua aparecendo uma vez só.

É para a empresa que usa o canal direto e deixa o vendedor responder pelo celular quando
quiser. A regra é a mesma decidida para a API Oficial na coexistência (B23), mas esta
spec é separada e vale só para o canal direto.

A mudança toca os dois lados do contrato entre gateway e CRM, que está congelado: o
gateway passa a mandar um evento novo. O Luan precisa ser avisado antes da
implementação.

## Páginas / Módulos

### Gateway: aviso de mensagem enviada pelo celular

**Descrição:** o gateway deixa de descartar a mensagem que sai do número conectado por
outro aparelho e avisa o CRM, num evento próprio, separado de "mensagem recebida". O que
o próprio CRM mandou pelo gateway continua sem aviso, porque o CRM já registrou.

**Componentes:**
- Evento novo para o CRM: mensagem enviada pelo celular, com o destinatário, o tipo, o
  conteúdo (texto ou arquivo, como na mensagem recebida), a mensagem citada quando houver
  e o horário.

**Comportamentos:**
- O vendedor envia uma mensagem pelo celular a um contato, e o gateway avisa o CRM.
- O vendedor envia pelo WhatsApp Web (ou outro aparelho conectado), e o gateway avisa o
  CRM do mesmo jeito.
- O CRM envia uma mensagem pelo gateway, e o gateway não avisa nada de volta.
- O vendedor envia num grupo, numa lista de transmissão ou num status, e o gateway não
  avisa nada.
- O vendedor envia pelo celular enquanto o CRM está fora do ar, e o aviso chega quando o
  CRM volta, como já acontece com a mensagem recebida.

**Critérios de aceite:**

#### CA-B25-01 — Mensagem enviada pelo celular gera o aviso para o CRM · prova: automática

- **Dado** um número conectado pelo canal direto
- **Quando** sai do número, por outro aparelho, uma mensagem de texto para um contato
- **Então** o gateway entrega ao CRM o evento de mensagem enviada pelo celular, com o
  destinatário, o texto e o horário, assinado como os demais eventos

#### CA-B25-02 — O que o CRM enviou não volta como enviado pelo celular · prova: automática

- **Dado** uma mensagem que o CRM mandou pelo gateway
- **Quando** o WhatsApp confirma a saída dela pelo número
- **Então** o gateway não entrega aviso de mensagem enviada pelo celular para ela

#### CA-B25-03 — Grupo, lista de transmissão e status continuam fora · prova: automática

- **Dado** um número conectado pelo canal direto
- **Quando** o vendedor envia, pelo celular, numa conversa de grupo, numa lista de
  transmissão ou num status
- **Então** o gateway não entrega aviso nenhum

#### CA-B25-04 — Foto, áudio, vídeo e documento enviados pelo celular chegam com o arquivo · prova: automática

- **Dado** um número conectado pelo canal direto
- **Quando** o vendedor envia, pelo celular, uma foto com legenda, um áudio, um vídeo ou
  um documento
- **Então** o aviso leva o tipo, a legenda quando houver e o arquivo, do mesmo jeito que a
  mensagem recebida leva

#### CA-B25-05 — Aviso repetido não vira mensagem repetida · prova: automática

- **Dado** um aviso de mensagem enviada pelo celular já entregue ao CRM
- **Quando** o gateway entrega o mesmo aviso de novo (reentrega)
- **Então** o CRM mostra a mensagem uma vez só

### CRM: mensagem enviada pelo celular na conversa

**Descrição:** o CRM recebe o aviso e põe a mensagem na conversa do contato, do lado da
empresa, com a marca "Enviada pelo celular" no lugar do nome do atendente.

**Componentes:**
- Balão de mensagem de saída com a marca "Enviada pelo celular".
- Prévia da conversa na caixa de entrada com o texto da última mensagem, que pode ser a
  enviada pelo celular.

**Comportamentos:**
- Ver, na conversa aberta, a mensagem enviada pelo celular aparecer sem recarregar a tela.
- Ver a marca "Enviada pelo celular" na mensagem, sem nome de atendente.
- Ver a prévia da conversa na caixa de entrada mudar para a mensagem enviada pelo celular.
- Enviar pelo celular a um número que ainda não é contato e ver o contato e a conversa
  nascerem no CRM.
- Responder pelo celular numa conversa resolvida e vê-la reaberta.
- Responder pelo celular citando uma mensagem e ver a citação na conversa do CRM.

**Critérios de aceite:**

#### CA-B25-06 — Mensagem enviada pelo celular aparece na conversa · prova: automática

- **Dado** um contato com conversa aberta no CRM
- **Quando** chega o aviso de mensagem enviada pelo celular para ele
- **Então** a mensagem entra na conversa como enviada pela empresa, com a marca
  "Enviada pelo celular" e sem atendente, e a prévia da conversa passa a ser ela

#### CA-B25-07 — A mensagem aparece em tempo real · prova: automática

- **Dado** a conversa aberta na tela do CRM
- **Quando** chega o aviso de mensagem enviada pelo celular para aquele contato
- **Então** a mensagem aparece na tela sem recarregar, pelo mesmo caminho das mensagens
  recebidas

#### CA-B25-08 — Envio pelo celular a número desconhecido cria contato e conversa · prova: automática

- **Dado** um telefone que não é contato do CRM
- **Quando** chega o aviso de mensagem enviada pelo celular para ele
- **Então** o CRM cria o contato e a conversa, com a mensagem dentro, e não cria card em
  funil nenhum

#### CA-B25-09 — Resposta pelo celular reabre a conversa resolvida · prova: automática

- **Dado** um contato cuja conversa está resolvida
- **Quando** chega o aviso de mensagem enviada pelo celular para ele
- **Então** a conversa volta a ficar aberta, em atendimento, com a mensagem dentro

#### CA-B25-10 — Mensagem citada aparece como citação · prova: automática

- **Dado** uma mensagem do contato já exibida na conversa
- **Quando** o vendedor responde a ela pelo celular, citando-a
- **Então** a mensagem enviada pelo celular aparece no CRM com a citação da original

#### CA-B25-11 — Enviar pelo celular não soma "não lidas" · prova: automática

- **Dado** uma conversa com mensagens não lidas
- **Quando** chega o aviso de mensagem enviada pelo celular
- **Então** o número de não lidas da conversa não aumenta

### CRM: mensagem do celular vale como resposta do time

**Descrição:** para tudo o que o CRM conta como resposta do time, a mensagem enviada pelo
celular vale como uma mensagem enviada pelo CRM. A diferença é que ela não tem atendente.

**Comportamentos:**
- Responder pelo celular e ver a automação de "mensagem enviada pelo time" rodar.
- Responder pelo celular e ver a conversa deixar de constar como sem resposta.

**Critérios de aceite:**

#### CA-B25-12 — Envio pelo celular dispara "mensagem enviada pelo time" · prova: automática

- **Dado** uma automação ativa com o gatilho "Mensagem enviada pelo time"
- **Quando** chega o aviso de mensagem enviada pelo celular
- **Então** a automação roda para aquele contato, como rodaria com uma mensagem enviada
  pelo CRM

#### CA-B25-13 — Envio pelo celular conta como resposta onde o CRM conta resposta · prova: automática

- **Dado** uma conversa que o CRM trata como aguardando resposta do time (alertas,
  métricas do dashboard e sequências que reagem à resposta)
- **Quando** chega o aviso de mensagem enviada pelo celular
- **Então** cada um desses lugares passa a tratar a conversa como respondida, do mesmo
  jeito que trataria uma mensagem enviada pelo CRM

### Teste com chip real

**Critérios de aceite:**

#### CA-B25-14 — Conversa completa no CRM, com chip real · prova: manual

- **Dado** um número conectado pelo canal direto e a conversa aberta no CRM
- **Quando** o vendedor envia pelo celular um texto, uma foto e um áudio, e depois
  responde pelo CRM
- **Então** os três envios do celular aparecem no CRM em poucos segundos, marcados
  "Enviada pelo celular". A resposta pelo CRM aparece uma vez só, sem a marca, e também
  aparece no celular.

## Fora de escopo

- API Oficial: o envio pelo celular nela é tratado na coexistência (B23).
- Conversas antigas do celular, anteriores à conexão (histórico).
- Reação, edição e exclusão feitas pelo vendedor no celular.
- Mensagens em grupo, lista de transmissão e status.
- Mensagem que o vendedor manda para o próprio número.
- Qualquer mudança no aquecimento e no ritmo de envio: mensagem enviada pelo celular não
  passa pela fila do gateway nem gasta vaga dela.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B25-01 | Alertas, métricas do dashboard e sequências reconhecem a resposta do time olhando as mensagens de saída da conversa. Gravada como mensagem de saída, a do celular passa a contar sem mudar esses módulos. A conferir no /plan, módulo a módulo. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B25-02 | Hoje, quando o atendente escreve pelo CRM numa conversa resolvida, ela volta a ficar em atendimento. A resposta pelo celular segue a mesma regra. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B25-03 | O gateway consegue distinguir, por um registro que ele já guarda, toda mensagem que o próprio CRM enviou. O registro dura 30 dias, mais do que o tempo entre o envio e a confirmação do WhatsApp. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B25-04 | Mensagem enviada pelo celular enquanto o número estava pausado ou o gateway reiniciava entra no CRM pela mesma janela de mensagens atrasadas que já vale para as recebidas. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B25-05 | O contato criado por envio pelo celular nasce sem nome. Nesse caso o WhatsApp não manda o nome do destinatário, e o nome entra quando ele responder (correção de 15/10/2026). | confirmada | Marcelle, 15/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B25-01 | A mensagem enviada pelo celular vale como resposta do time? | respondida | Sim, para tudo: automação "mensagem enviada pelo time", sequências, alertas e métricas. Marcelle, 15/10/2026. |
| PER-B25-02 | Envio pelo celular a número que não é contato do CRM: cria ou ignora? | respondida | Cria o contato e a conversa, sem card. Marcelle, 15/10/2026. |
| PER-B25-03 | Resposta pelo celular em conversa resolvida: reabre ou fica resolvida? | respondida | Reabre, em atendimento. Marcelle, 15/10/2026. |
| PER-B25-04 | Quem avisa o Luan da mudança no contrato do gateway, e quando? | respondida | A Marcelle avisa. Marcelle, 15/10/2026. |
