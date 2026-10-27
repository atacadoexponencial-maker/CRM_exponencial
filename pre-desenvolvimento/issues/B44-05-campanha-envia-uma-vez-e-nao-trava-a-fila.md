# B44-05: Campanha sai uma vez só, não trava a fila e pula contato apagado

**Tipo:** Implementação
**Página:** Campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O envio da campanha passa a reservar cada destinatário antes de enviar, campanhas que não têm como sair viram "Interrompida" e saem da fila, e contato apagado de vez não recebe nem no envio nem no reenvio.

## Pronto quando

Duas execuções simultâneas mandam uma mensagem por destinatário; uma empresa com campanhas travadas não segura a campanha de outra; o relatório mostra o contato apagado como não enviado com o motivo "contato apagado".

## Critérios de aceite

- **CA-B44-18** (automática) — Envio simultâneo não manda a mesma mensagem duas vezes. Dado uma campanha "Enviando" com 40 destinatários pendentes, quando duas execuções do envio rodam ao mesmo tempo, então cada destinatário recebe exatamente uma mensagem e o relatório mostra 40 envios
- **CA-B44-19** (automática) — Campanha que não tem como sair vira "Interrompida". Dado uma campanha "Enviando" cujo conteúdo não pode ser enviado, quando o envio automático roda, então a campanha aparece como "Interrompida", com o motivo dito na tela, e sai da fila
- **CA-B44-20** (automática) — Campanhas travadas de uma empresa não seguram a de outra. Dado a empresa A com 3 ou mais campanhas "Enviando" que não têm como sair e a empresa B com uma campanha válida "Enviando", quando o envio automático roda uma vez, então a campanha de B começa a sair nessa mesma rodada
- **CA-B44-21** (automática) — Contato apagado de vez não recebe a campanha. Dado uma campanha com lista montada que inclui o contato C, e C ainda pendente, quando C é apagado de vez e a campanha é enviada, então C não recebe a mensagem e o relatório mostra que ele não foi enviado porque o contato foi apagado
- **CA-B44-22** (automática) — Reenvio para falhas pula contato apagado de vez. Dado uma campanha em que o envio para o contato C falhou, quando C é apagado de vez e o Gerente reenvia para quem falhou, então C não recebe a mensagem

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-02 | Campanha que não tem como sair vira "Interrompida" com motivo, reaproveitando o status que já existe para quem para no meio. Ela não é apagada nem cancelada | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-08 | O contato apagado de vez aparece no relatório da campanha como não enviado, com o motivo "contato apagado" | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

Nenhuma.
