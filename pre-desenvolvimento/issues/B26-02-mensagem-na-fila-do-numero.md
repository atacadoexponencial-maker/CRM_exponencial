# B26-02: Mensagem "Na fila do número" até sair de fato

**Tipo:** Implementação
**Página:** Chat (`/chat`), e as mensagens enviadas por automação, sequência e campanha
**Spec:** `pre-desenvolvimento/spec-mensagem-na-fila.md`

## Descrição

No canal direto, a mensagem aceita pela fila do número fica gravada e exibida como
"Na fila do número", com um relógio, e só vira ✓ quando o número avisa que ela saiu.
Isso vale para o chat, as automações, as sequências e as campanhas. O aviso de saída que
chega antes de a mensagem estar gravada não se perde. A API Oficial continua como hoje.

Depende da B26-01: é ela que faz o relógio virar ✓ na tela sem recarregar.

## Pronto quando

Com um número do canal direto em aquecimento e as vagas da hora usadas, o atendente
envia uma mensagem, vê o relógio "Na fila do número" e vê o relógio virar ✓ sozinho
quando a mensagem sai e chega ao celular do cliente.

## Critérios de aceite

- **CA-B26-01** (automática) — Mensagem aceita pela fila aparece "Na fila do número". Dado uma conversa de um número do canal direto, quando o atendente envia um texto pelo chat e o número o aceita na fila, então a mensagem aparece com o relógio e "Na fila do número", e não com ✓.
- **CA-B26-02** (automática) — Mídia enviada também aparece na fila. Dado uma conversa de um número do canal direto, quando o atendente envia uma foto, um áudio, um vídeo ou um documento, então a mensagem aparece com o relógio e "Na fila do número".
- **CA-B26-03** (automática) — Mensagem de automação e de sequência também aparece na fila. Dado uma regra de automação ou uma sequência que envia mensagem por número do canal direto, quando a mensagem é aceita na fila, então ela fica gravada como na fila, e quem abre a conversa vê o relógio.
- **CA-B26-04** (automática) — O relógio vira ✓ quando a mensagem sai, sem recarregar. Dado uma mensagem na fila, exibida na conversa aberta, quando o número avisa que a enviou, então o relógio vira ✓ na tela, sem recarregar.
- **CA-B26-06** (automática) — Aviso de envio que chega antes da mensagem gravada não se perde. Dado uma mensagem que o número enviou tão rápido que o aviso de envio chegou antes de o CRM terminar de gravá-la, quando o CRM recebe esse aviso, então o aviso não é perdido: o CRM pede que ele seja reenviado, e a mensagem termina com o status certo, sem ficar presa em "Na fila do número".
- **CA-B26-07** (automática) — API Oficial continua como hoje. Dado uma conversa de um número da API Oficial, quando o atendente envia uma mensagem, então ela aparece com ✓, sem relógio.
- **CA-B26-08** (manual) — Fila parada pelo aquecimento, com chip real. Dado um número do canal direto conectado há menos de três dias, com as 4 vagas da hora usadas, quando o atendente envia mais uma mensagem, então ela fica com o relógio até a vaga abrir, e vira ✓ sozinha quando sai e chega ao celular do cliente.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B26-01 | O número sempre avisa o CRM quando uma mensagem sai da fila ("enviada"), além de entregue e lida. Hoje o CRM já entende esse aviso. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B26-02 | Pedir o reenvio do aviso de envio, quando a mensagem ainda não está gravada, faz o número reenviar em poucos segundos. O pedido vale só para avisos recentes (até 2 minutos), para não pedir reenvio para sempre de mensagem que o CRM nunca gravou. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B26-03 | Campanha grava a mensagem na conversa como o chat grava, e por isso ganha o relógio e a correção da CA-B26-05 sem tratamento à parte. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B26-03 | Mostrar a hora prevista de saída de cada mensagem? | respondida | Não agora: a previsão do gateway é imprecisa. Fica para spec do gateway. Marcelle, 15/10/2026. |
