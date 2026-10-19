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

> **Conferência do /plan (19/10/2026), módulo a módulo, da SUP-B25-01:**
>
> - **Alertas:** o "Lead sem resposta" (`calcularAlertas`, em `src/lib/alertas.ts`) mede a
>   última atividade pelo `conversations.last_message_at` (`src/app/(auth)/alertas/actions.ts`).
>   A B25-02 já atualiza esse campo com o horário da mensagem do celular, então o alerta
>   já conta a resposta, sem mudança aqui.
> - **Dashboard:** as métricas (`src/app/(auth)/dashboard/actions.ts`) leem cards, compras e
>   histórico do funil, e nenhuma lê mensagens. Não há o que contar.
> - **Sequências:** `src/lib/sequencias.ts` não reage à resposta: avança por prazo e por
>   lembrete feito. Não há o que mudar.
> - **Automação "Mensagem enviada pelo time":** é a única que não conta hoje. O chat a
>   dispara à mão (`dispararMensagemEnviadaPeloTime`, em `src/lib/automacoes/gatilhos-do-crm.ts`)
>   depois de gravar o envio. É o que esta issue acrescenta para a mensagem do celular.

## Cenários

### Happy Path
1. Chega o aviso de mensagem enviada pelo celular, e a B25-02 grava a mensagem.
2. Com a mensagem gravada, `registrarEnviadaPeloCelular` chama
   `dispararMensagemEnviadaPeloTime` com a empresa, o contato, a conversa, a mensagem, o
   tipo e o texto. O formato é o mesmo do envio pelo chat.
3. As automações com o gatilho "Mensagem enviada pelo time" rodam para o contato.
4. A conversa já tem o `last_message_at` novo (B25-02), e o "Lead sem resposta" deixa de
   aparecer para o card do contato.

### Edge Cases
- **Reentrega do mesmo aviso:** o `insert` esbarra no `wamid` único, nada é gravado e o
  gatilho não dispara de novo, igual ao recebimento.
- **Foto, áudio, vídeo e documento:** o gatilho leva o tipo (`imagem`, `audio`, `video`,
  `documento`) e o texto vazio, como o chat faz com mídia. Só a mensagem de texto leva
  texto.
- **Conversa nova por envio pelo celular:** dispara só "Mensagem enviada pelo time", nunca
  "conversa criada" (SUP-B25-06).
- **Tipo desconhecido com texto:** vai como `texto`, pela mesma `tipoDaMensagemParaRegras`
  do recebimento.

### Cenário de Erro
- Falha nas automações não desfaz a mensagem: `dispararAutomacoes` só enfileira, e as
  regras rodam depois da resposta, como no chat.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B25-12 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | O aviso gravado dispara o evento `mensagem_enviada_time` com o contato, a conversa, a mensagem, o tipo e o texto, igual ao envio pelo chat; a reentrega (insert recusado) não dispara |
| CA-B25-13 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | Card de lead com alerta "Lead sem resposta": usado como última atividade, o `last_message_at` gravado pelo aviso do celular faz o alerta sumir em `calcularAlertas` |

## Arquivos

- **Modificar:** `src/lib/whatsapp/enviada-pelo-celular.ts`: depois de gravar a mensagem, chama `dispararMensagemEnviadaPeloTime`
- **Modificar:** `src/test/gateway-enviada-pelo-celular.test.ts`: testes de CA-B25-12 e CA-B25-13. O teste do CA-B25-08 (B25-02) passa a conferir que não dispara "conversa criada", em vez de nenhuma automação, porque agora "mensagem enviada pelo time" dispara

## Checklist

- [x] `registrarEnviadaPeloCelular` dispara `dispararMensagemEnviadaPeloTime` só com a mensagem gravada, com o tipo e o texto no formato do chat
- [x] Teste do CA-B25-08 ajustado para "sem conversa criada"
- [x] Testes de CA-B25-12 e CA-B25-13 escritos e passando
- [x] Build verde
