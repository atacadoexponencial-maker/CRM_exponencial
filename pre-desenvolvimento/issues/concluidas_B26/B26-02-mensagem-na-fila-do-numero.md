# B26-02: Mensagem "Na fila do número" até sair de fato

**Tipo:** Implementação
**Página:** Chat (`/chat`), e as mensagens enviadas por automação e sequência
**Spec:** `pre-desenvolvimento/spec-mensagem-na-fila.md`

## Descrição

No canal direto, a mensagem aceita pela fila do número fica gravada e exibida como
"Na fila do número", com um relógio, e só vira ✓ quando o número avisa que ela saiu.
Isso vale para o chat, as automações e as sequências (a campanha não grava mensagem na conversa e já usa "na_fila" no destinatário). O aviso de saída que
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
| SUP-B26-01 | O número sempre avisa o CRM quando uma mensagem sai da fila ("enviada"), além de entregue e lida. Hoje o CRM já entende esse aviso. | confirmada | Marcelle, 15/10/2026. Conferido no /plan: o gateway publica \"sent\" a cada envio da fila, e o CRM o traduz para \"enviado\". |
| SUP-B26-02 | Pedir o reenvio do aviso de envio, quando a mensagem ainda não está gravada, faz o número reenviar em poucos segundos. O pedido vale só para avisos recentes (até 2 minutos), para não pedir reenvio para sempre de mensagem que o CRM nunca gravou. | invalidada | /plan da B26-02 (15/10/2026): a reentrega do gateway espera 1, 2, 4… minutos, não segundos. Substituída pela SUP-B26-05. |
| SUP-B26-03 | Campanha grava a mensagem na conversa como o chat grava, e por isso ganha o relógio e a correção da CA-B26-05 sem tratamento à parte. | invalidada | /plan da B26-02 (15/10/2026): a campanha não grava mensagem na conversa, só o destinatário, e ali já usa \"na_fila\" no canal direto (`src/lib/campanhas.ts`). Campanha fica fora da B26-02. |
| SUP-B26-05 | Na corrida rara (aviso de envio antes de a mensagem estar gravada), o CRM pede reentrega e o gateway reenvia em 1 minuto; nesse minuto, os outros avisos daquele contato esperam. O CRM só pede reentrega para aviso de até 5 minutos; mais velho que isso, aceita e descarta. | confirmada | Marcelle, 15/10/2026. |
| SUP-B26-06 | Enquanto a ação de envio não responde, a mensagem nova fica sem ícone de status (hoje aparece ✓ de imediato). Na resposta, ganha o relógio (canal direto) ou ✓ (API Oficial). Evita mostrar ✓ e logo trocar pelo relógio. | confirmada | Marcelle, 15/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B26-03 | Mostrar a hora prevista de saída de cada mensagem? | respondida | Não agora: a previsão do gateway é imprecisa. Fica para spec do gateway. Marcelle, 15/10/2026. |

## Cenários

### Happy Path
1. O atendente envia uma mensagem (texto ou mídia) numa conversa de número do canal direto.
2. A mensagem aparece sem ícone enquanto a ação responde (SUP-B26-06).
3. O gateway aceita na fila; a ação grava a mensagem com status `na_fila` e devolve o id e o status.
4. A tela troca o id provisório pelo real e mostra o relógio com "Na fila do número".
5. O gateway envia e publica "sent"; o webhook do gateway atualiza a linha para `enviado`.
6. A atualização em tempo real chega à tela (B26-01) e o relógio vira ✓; depois ✓✓ e ✓✓ azul.
7. Automação e sequência gravam a mensagem como `na_fila` do mesmo jeito (envio central `whatsapp-envio.ts`).

### Edge Cases
- **API Oficial:** grava `enviado`, como hoje; a tela mostra ✓.
- **Aviso "sent" antes de a mensagem estar gravada:** o webhook não acha a mensagem nem destinatário de campanha; se o aviso tem até 5 minutos, responde 503 e não marca o evento como processado; o gateway reentrega em 1 minuto e acha a mensagem (SUP-B26-05).
- **Aviso de status de mensagem que o CRM nunca gravou** (saiu, mas a gravação falhou) ou com mais de 5 minutos: aceito e descartado, como hoje, para não pedir reentrega para sempre.
- **Aviso de campanha:** a campanha não grava mensagem, só o destinatário; o aviso que atualiza o destinatário conta como achado.
- **Mensagem antiga gravada com `enviado`:** continua como está.
- **Status desconhecido no gateway:** ignorado, como hoje.

### Cenário de Erro
- **Gateway recusou:** a ação devolve o motivo; nada é gravado como `na_fila` (texto continua gravado como `falhou`, como hoje).
- **Gravação falhou depois do aceite:** a ação não devolve id; a tela fica sem ícone (mensagem não confirmada), como a B26-01 trata.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B26-01 | automática | `src/test/chat-envio-automacoes.test.ts` | Texto enviado por número do canal direto é gravado como `na_fila`, e a ação devolve esse status para a tela |
| CA-B26-01 | automática | `src/test/balao-status-na-fila.test.tsx` | Mensagem `na_fila` mostra o relógio e "Na fila do número", e não ✓ |
| CA-B26-02 | automática | `src/test/chat-envio-automacoes.test.ts` | Foto e documento enviados por número do canal direto são gravados como `na_fila` |
| CA-B26-03 | automática | `src/test/chat-envio-automacoes.test.ts` | O envio de automações e sequências (`enviarWhatsAppComMotivo`) grava `na_fila` no canal direto |
| CA-B26-04 | automática | `src/test/balao-status-na-fila.test.tsx` | A mensagem na fila que recebe o status `enviado` (atualização em tempo real) passa a mostrar ✓ e deixa de mostrar "Na fila do número" |
| CA-B26-06 | automática | `src/test/gateway-webhook.test.ts` | Aviso de status recente de mensagem que o CRM ainda não gravou responde 503 e o evento não fica processado; mensagem achada ou aviso antigo respondem 2xx |
| CA-B26-07 | automática | `src/test/chat-envio-automacoes.test.ts` | Envio por número da API Oficial grava `enviado` e devolve `enviado` |
| CA-B26-08 | manual | roteiro abaixo | Relógio até a vaga abrir e ✓ sozinho quando sai, com chip real |

### Roteiro manual — CA-B26-08
1. Use um número do canal direto conectado há menos de 3 dias (aquecimento: 4 mensagens por hora).
2. Mande 4 mensagens pelo chat dentro da mesma hora, a um contato seu.
3. Mande a 5ª: ela deve aparecer com o relógio e "Na fila do número".
4. Deixe a conversa aberta, sem recarregar, até a vaga abrir (1 hora depois da 1ª).
5. O relógio deve virar ✓ sozinho, e a mensagem deve chegar ao celular do contato nesse momento.

## Banco de Dados

Nenhuma migration: `messages.status` é texto livre, sem restrição de valores. Valor novo: `na_fila`.

## Arquivos

- **Modificar:** `src/lib/whatsapp/index.ts` — `statusInicialDoEnvio(canal)`: `na_fila` no canal direto, `enviado` na API Oficial (mesma regra que `src/lib/campanhas.ts` já usa para o destinatário).
- **Modificar:** `src/app/(auth)/chat/actions.ts` — os cinco envios gravam `statusInicialDoEnvio(provider.canal)` e devolvem `{ mensagemId, status }`.
- **Modificar:** `src/lib/whatsapp-envio.ts` — `enviarWhatsAppComMotivo` grava `statusInicialDoEnvio(provider.canal)`.
- **Modificar:** `src/app/(auth)/chat/mock-mensagens.ts` — `StatusMensagem` ganha `na_fila`.
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — `IconeStatus` mostra relógio (`Clock`, Lucide) e "Na fila do número" para `na_fila`.
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — mensagem nova nasce sem status; na confirmação, passa o status devolvido.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — `handleMensagemConfirmada` recebe o status e o usa quando não há status guardado.
- **Modificar:** `src/lib/whatsapp/eventos-de-operacao.ts` — `aplicarStatusDeMensagem` diz se achou a mensagem ou o destinatário de campanha.
- **Modificar:** `src/app/api/webhooks/gateway/route.ts` — aviso de status recente (até 5 minutos) que não achou nada responde 503 sem marcar o evento como processado.
- **Modificar:** `src/test/chat-envio-automacoes.test.ts` — testes da CA-B26-01, 02, 03 e 07; o provider falso ganha `canal` e o cliente falso registra o conteúdo gravado; as expectativas do retorno do envio (B11-05 e B26-01) passam a incluir o status (consequência direta desta issue).
- **Criar:** `src/test/balao-status-na-fila.test.tsx` — testes da CA-B26-01 e 04 na tela.
- **Modificar:** `src/test/gateway-webhook.test.ts` — testes da CA-B26-06.

Reuso: `aplicarStatus` e `confirmarEnvio` de `src/app/(auth)/chat/mensagens-locais.ts` (B26-01); `STATUS_NO_CRM` de `eventos-de-operacao.ts`; o cliente falso de `chat-envio-automacoes.test.ts`.

## Checklist

- [x] `statusInicialDoEnvio` em `src/lib/whatsapp/index.ts`
- [x] Chat grava `na_fila` no canal direto e devolve o status
- [x] Envio central (automações e sequências) grava `na_fila` no canal direto
- [x] Tela: mensagem nova sem ícone até a resposta; relógio "Na fila do número" para `na_fila`
- [x] Webhook do gateway pede reentrega de aviso recente sem mensagem gravada
- [x] Testes da CA-B26-01, 02, 03, 04, 06 e 07

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B26-08 | Marcelle | 20/10/2026 |
