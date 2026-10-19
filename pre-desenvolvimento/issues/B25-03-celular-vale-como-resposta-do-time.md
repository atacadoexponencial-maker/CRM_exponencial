# B25-03: Mensagem do celular vale como resposta do time

**Tipo:** Implementação
**Página:** Automações (gatilho "Mensagem enviada pelo time"), Alertas, Dashboard e Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-canal-direto-envio-pelo-celular.md`

## Descrição

Para tudo o que o CRM conta como resposta do time, a mensagem enviada pelo celular (gravada
pela B25-02) vale como uma mensagem enviada pelo CRM, só que sem atendente: dispara a
automação "Mensagem enviada pelo time" e tira a conversa de "aguardando resposta" em
alertas, métricas do dashboard e sequências.

## Pronto quando

O vendedor responde pelo celular a um contato que estava aguardando resposta: a automação
de "Mensagem enviada pelo time" roda para ele, o alerta de sem resposta some, e o
dashboard e a sequência tratam a conversa como respondida.

## Critérios de aceite

- **CA-B25-12** (automática) — Envio pelo celular dispara "mensagem enviada pelo time". Dado uma automação ativa com o gatilho "Mensagem enviada pelo time", quando chega o aviso de mensagem enviada pelo celular, então a automação roda para aquele contato, como rodaria com uma mensagem enviada pelo CRM.
- **CA-B25-13** (automática) — Envio pelo celular conta como resposta onde o CRM conta resposta. Dado uma conversa que o CRM trata como aguardando resposta do time (alertas, métricas do dashboard e sequências que reagem à resposta), quando chega o aviso de mensagem enviada pelo celular, então cada um desses lugares passa a tratar a conversa como respondida, do mesmo jeito que trataria uma mensagem enviada pelo CRM.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B25-01 | Alertas, métricas do dashboard e sequências reconhecem a resposta do time olhando as mensagens de saída da conversa. Gravada como mensagem de saída, a do celular passa a contar sem mudar esses módulos. A conferir no /plan, módulo a módulo. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B25-01 | A mensagem enviada pelo celular vale como resposta do time? | respondida | Sim, para tudo: automação "mensagem enviada pelo time", sequências, alertas e métricas. Marcelle, 15/10/2026. |
