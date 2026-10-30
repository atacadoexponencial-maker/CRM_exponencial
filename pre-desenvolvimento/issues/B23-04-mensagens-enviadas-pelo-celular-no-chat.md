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
| SUP-B23-10 | Na CA-B23-22, "sequência" é lida como as automações em fluxo: as sequências automáticas saíram na B28-06 e o que elas faziam hoje é a automação (gatilho de resposta do time). | confirmada | Marcelle, 30/10/2026. |
| SUP-B23-17 | O eco do celular pode trazer áudio, embora a referência da Meta liste só texto, foto, vídeo, documento, revoke e edit; o código aceita áudio se vier e o teste com chip (CA-B23-20) confere. | confirmada | Marcelle, 30/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-03 | Mensagem enviada pelo celular vale como resposta do time? | respondida | Sim: vale para sequências, automações e métricas, marcada como "Enviada pelo celular". Marcelle, 10/10/2026. |
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | respondida | Marcelle ainda não tem o número (30/10/2026): o código segue, e os três testes com chip ficam pendentes no auditor até ela ter o número. |

## Cenários

### Happy Path
1. O vendedor manda uma mensagem pelo WhatsApp Business do celular. A Meta avisa pelo webhook `field: "smb_message_echoes"`, com `message_echoes[]` (`from` = número da empresa, `to` = contato, `id`, `timestamp`, `type` e o conteúdo).
2. O webhook da Meta acha a conexão pelo `phone_number_id`; só segue se ela está em uso no celular.
3. Cada eco de texto, foto, vídeo, áudio ou documento vira o mesmo evento que o canal direto já produz (`EventoMensagemEnviadaPeloCelular`): `to` em dígitos, tipo no vocabulário da Meta (igual ao do gateway), texto ou legenda; a mídia é baixada da Meta (`guardarMidiaDaMeta`, com o token da conexão) e entregue já guardada.
4. `registrarEnviadaPeloCelular` (B25-02/03) faz o resto, exatamente como no canal direto: contato (criado sem nome se não existe), conversa aberta ou reaberta do mesmo número, mensagem `enviada` com `sent_from_phone = true` e `status = "enviado"`, sem somar não lidas, transmissão em tempo real e o gatilho "mensagem enviada pelo time".
5. No chat, a mensagem aparece do lado da empresa com "Enviada pelo celular" e sem atendente (a mensagem não tem autor; a conversa não ganha responsável). A conversa sai de "Esperando resposta" no dashboard, porque a última mensagem passa a ser da empresa.

### Edge Cases
- Eco repetido (a Meta reentrega quando não recebe resposta a tempo): o `wamid` único recusa a segunda gravação e nada é transmitido de novo (B25-05).
- Eco de `type: "revoke"` ou `"edit"` (o vendedor apagou ou editou pelo celular): fica para a B23-05; aqui é ignorado.
- Eco para número que já está numa conversa resolvida: ela é reaberta (regra do botão Reabrir, SUP-B25-07).
- Eco de mídia que não baixou: a mensagem entra com a legenda ou "Arquivo não recebido", como no canal direto.
- Conexão que não está em uso no celular recebe eco: ignorado.
- A documentação lista `text, image, video, document, revoke, edit` como tipos do eco; áudio não aparece na lista (SUP-B23-17). O código aceita áudio se vier.

### Cenário de Erro
- Falha de banco: o webhook responde 500 e a Meta reentrega.
- Eco sem `to` ou sem `id`: ignorado, com o resto do pacote processado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-19 | automática | `src/test/eco-do-celular.integration.test.ts` e `src/test/eco-do-celular.test.tsx` | O webhook de eco grava a mensagem na conversa do contato como `enviada`, `sent_from_phone = true`, sem mexer no atendente da conversa; a mensagem com essa marca aparece no balão com "Enviada pelo celular". Reentrega não duplica. |
| CA-B23-20 | manual | roteiro abaixo | Texto, foto e áudio enviados pelo celular aparecem no CRM em poucos segundos; mensagem do CRM aparece no celular. |
| CA-B23-21 | automática | `src/test/eco-do-celular.integration.test.ts` | Eco para telefone desconhecido cria o contato (sem nome) e a conversa, com a mensagem dentro. |
| CA-B23-22 | automática | `src/test/eco-do-celular.integration.test.ts` | Conversa listada em "Esperando resposta" (última mensagem do cliente) sai da lista depois do eco, e o gatilho "mensagem enviada pelo time" é disparado como no envio pelo chat. |

### Roteiro manual — CA-B23-20
1. Com o número em coexistência conectado (B23-01), abrir no CRM a conversa de um contato de teste.
2. No celular, mandar para esse contato um texto, uma foto e um áudio pelo WhatsApp Business.
3. Os três devem aparecer na conversa do CRM em poucos segundos, do lado da empresa, com "Enviada pelo celular", sem recarregar a tela.
4. Pelo CRM, mandar uma mensagem ao contato: ela deve aparecer no aplicativo do celular, na mesma conversa.

## Arquivos

- **Criar:** `src/lib/whatsapp/eco-do-celular.ts` — `processarEcos`: traduz `message_echoes[]` para o evento do canal direto, baixa a mídia pela Meta e chama `registrarEnviadaPeloCelular`.
- **Modificar:** `src/lib/whatsapp/enviada-pelo-celular.ts` — `registrarEnviadaPeloCelular` aceita a mídia já guardada (`midiaGuardada`), para a Meta, no lugar do download pelo gateway.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — despacha `smb_message_echoes` para a lib.
- **Criar:** `src/test/eco-do-celular.integration.test.ts` — CA-B23-19, CA-B23-21 e CA-B23-22 contra o banco de teste, webhook assinado (padrão de `src/test/historico-do-celular.integration.test.ts`).
- **Criar:** `src/test/eco-do-celular.test.tsx` — parte de tela do CA-B23-19: o balão com a marca (reusa o padrão de `src/test/balao-enviada-pelo-celular.test.tsx`).

## Dependências Externas

- Meta webhook `smb_message_echoes` (referência lida em 30/10/2026): `message_echoes[].{from,to,id,timestamp,type,text|image|video|document}`; `revoke` e `edit` ficam para a B23-05.

## Checklist

- [x] `registrarEnviadaPeloCelular` aceita mídia já guardada
- [x] `eco-do-celular.ts` traduz o eco e chama o registro
- [x] Webhook despacha `smb_message_echoes`
- [x] `tsc` sem erro (L-07) e os testes da B25 (`gateway-enviada-pelo-celular`, `balao-enviada-pelo-celular`) e do webhook passando (L-05)
