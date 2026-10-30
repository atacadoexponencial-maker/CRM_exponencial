# B23-04: Mensagens enviadas pelo celular aparecem no chat e valem como resposta do time

**Tipo:** Implementação
**Página:** Chat, Dashboard, Automações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Com o número em uso também no celular, a Meta avisa pelo webhook de cada mensagem que o vendedor envia pelo aplicativo. O CRM a coloca na conversa como enviada pela empresa, com a marca "Enviada pelo celular" e sem atendente, criando contato e conversa quando o telefone é desconhecido. Essa mensagem conta como resposta do time (deixa de aguardar resposta, entra no tempo de resposta do dashboard, vale para as automações). (O critério do template fora da janela, CA-B23-23, foi transferido para a série do template no Chat: PER-B23-06.)

## Pronto quando

O vendedor manda uma mensagem pelo celular e ela aparece na conversa do CRM em tempo real, marcada "Enviada pelo celular"; a conversa sai de "aguardando resposta".

## Critérios de aceite

- **CA-B23-19** (automática) — Mensagem enviada pelo celular aparece no chat do CRM. Dado um número conectado em uso também no celular, quando a Meta avisa de uma mensagem enviada pelo aplicativo, então ela aparece na conversa do contato como enviada pela empresa, com a marca "Enviada pelo celular" e sem atendente.
- **CA-B23-20** (manual) — O envio pelo celular aparece em tempo real, com chip real. Dado a conversa aberta no CRM, quando o vendedor envia texto, foto e áudio pelo celular, então os três aparecem no CRM em poucos segundos, sem recarregar a tela, e uma mensagem enviada pelo CRM aparece no aplicativo do celular.
- **CA-B23-21** (automática) — Envio pelo celular a número desconhecido cria o contato. Dado um telefone que não é contato do CRM, quando chega o aviso de mensagem enviada pelo celular para ele, então o CRM cria o contato e a conversa, com a mensagem dentro.
- **CA-B23-22** (automática) — Envio pelo celular vale como resposta do time. Dado uma conversa aguardando resposta, com sequência que para quando o time responde, quando chega o aviso de mensagem enviada pelo celular, então a conversa deixa de aguardar resposta, o tempo de resposta do dashboard é calculado até essa mensagem e a sequência se comporta como se a resposta tivesse saído pelo CRM.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-10 | Na CA-B23-22, "sequência" é lida como as automações em fluxo: as sequências automáticas saíram na B28-06 e o que elas faziam hoje é a automação (gatilho de resposta do time). | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-03 | Mensagem enviada pelo celular vale como resposta do time? | respondida | Sim: vale para sequências, automações e métricas, marcada como "Enviada pelo celular". Marcelle, 10/10/2026. |
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | aberta | Marcelle ainda não tem o número (10/10/2026). Só trava os três testes com chip real. |
