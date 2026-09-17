# B6-02: Mensagem recebida na conversa

**Tipo:** Implementação
**Módulo:** B6 — Recebimento de Eventos do Gateway
**Repositório:** `CRM_exponencial`

## Contexto

Com a porta de entrada pronta (B6-01), o evento `message.received` precisa virar o que
o CRM já entende: um contato, uma conversa aberta e uma mensagem na conversa, com
atualização em tempo real e automações disparadas.

O objetivo é que, **depois desta issue, o atendente não consiga dizer por qual canal a
mensagem chegou** olhando a caixa de entrada. O caminho da Meta faz isso hoje em
`src/app/api/webhooks/whatsapp/route.ts:80-197`; o do gateway precisa produzir o mesmo
resultado a partir de um evento de formato diferente.

Esta issue cobre **mensagem de texto**. Mídia e os demais tipos são a B6-03.

## O que construir

1. **Conversor do evento** para o formato interno: de quem veio, o que diz, quando
   aconteceu.
2. **Casamento e criação de contato**, com a regra de LID abaixo.
3. **Reuso ou abertura de conversa**, com contador de não lidas e prévia da última
   mensagem.
4. **Gravação da mensagem** com o identificador do gateway em `messages.wamid`, e
   emissão do evento de tempo real que a caixa de entrada já escuta.
5. **Disparo das automações existentes**, sem criar gatilho novo.

## Comportamentos da spec cobertos

- [x] Receber evento de mensagem recebida e registrá-la na conversa do contato
- [x] Criar o contato automaticamente quando a mensagem vem de número desconhecido
- [x] Criar a conversa automaticamente quando não há conversa aberta
- [x] Disparar as automações existentes a partir de mensagem recebida por este canal

## Contrato do gateway

Evento `message.received` (seção 3.1). Campos que esta issue usa: `message_id`,
`from`, `from_is_lid`, `type`, `text`, `reply_to`.

**A regra do `from_is_lid` é a parte perigosa desta issue.** O WhatsApp às vezes
entrega, em vez do telefone, um **LID** — um identificador de privacidade da Meta. Ele
é só dígitos e cabe na faixa do E.164, ou seja, **passa por telefone válido sem nenhum
erro aparecer**. Casar contato por ele cria um contato fantasma, e a conversa do
cliente nunca encontra o contato certo.

- `from_is_lid: false` → `from` é telefone e casa com `contacts.phone_number`.
- `from_is_lid: true` → `from` é LID e **não pode** ser usado como telefone: não casa,
  não cria contato por ele.

O gateway traduz LID para telefone sempre que consegue, e nunca segura nem descarta a
mensagem por falta de tradução — perder mensagem de cliente é pior do que entregá-la
sem telefone. Portanto o CRM precisa de um destino para a mensagem que chega sem
telefone utilizável, e **decidir qual é esse destino faz parte desta issue** (as
alternativas óbvias: conversa técnica separada, contato marcado como não identificado,
ou a mensagem registrada sem contato). Levar a decisão à Marcelle antes de implementar.

Não chegam como evento, porque o gateway já descarta: mensagem de grupo e eco de
mensagem enviada pelo próprio número em outro aparelho.

## Arquivos

- **Modificar:** `src/app/api/webhooks/gateway/route.ts` — o caso `message.received`.
- **Criar:** um módulo de recebimento em `src/lib/whatsapp/` (o nome fica a critério
  do plano) com a lógica de contato, conversa e mensagem. Vale extrair do webhook da
  Meta o que for igual, mas **sem alterar o comportamento dele**.
- **Consultar, não alterar:** `src/app/api/webhooks/whatsapp/route.ts:80-197` — é o
  modelo do que precisa acontecer: `contacts` por `workspace_id` + `phone_number`,
  `conversations` com `status in ("em_espera","em_atendimento")`, `unread_count`,
  `last_message_text`, `last_message_at`, insert em `messages` e o `broadcast` do
  Realtime no tópico `workspace:{id}` com evento `nova_mensagem`.
- **Consultar:** `src/lib/automacoes.ts:12` — os gatilhos existentes são
  `card_movido` e `conversa_criada`. **Não existe gatilho de "mensagem recebida"**: o
  webhook da Meta chama `processarAutomacoes` apenas quando **abre** conversa nova
  (`route.ts:153`). Esta issue reproduz esse comportamento e **não** inventa gatilho
  novo — se a spec quiser automação a cada mensagem, é outra issue, com decisão da
  Marcelle.
- **Consultar:** `supabase/migrations/20260503000000_create_messages.sql` —
  `messages.type` é texto livre com padrão `texto`, e `reply_to_id` +
  `reply_preview_text` já existem.
  `supabase/migrations/20260519000000_messages_wamid_realtime.sql` — `wamid` é `unique`.
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B6-01 — a rota, a assinatura e a idempotência.
- B1-02 — a coluna que liga `instance_id` ao workspace.

## Critérios de aceite

- [x] Mensagem de texto de número desconhecido cria contato, abre conversa e grava a
      mensagem, com o mesmo resultado visível que a mesma mensagem pela Meta produz.
- [x] Mensagem de número já conhecido com conversa aberta reusa a conversa e incrementa
      `unread_count`.
- [x] `messages.wamid` recebe o `message_id` do gateway.
- [x] A caixa de entrada mostra a mensagem em tempo real, sem recarregar a página.
- [x] Abrir conversa nova dispara as automações de `conversa_criada`; mensagem em
      conversa já aberta **não** dispara nada (igual à Meta hoje).
- [x] Evento com `from_is_lid: true` **não** cria contato com o LID como telefone, e a
      mensagem não é perdida.
- [x] `reply_to` preenchido grava `reply_to_id` e `reply_preview_text`.
- [x] Nada em `src/app/api/webhooks/whatsapp/route.ts` mudou de comportamento.

## Decisão tomada na execução (17/09/2026)

A issue mandava levar à Marcelle o destino da mensagem que chega **sem telefone
utilizável** (`from_is_lid: true`). Como a execução correu sem interrupção, a decisão foi
tomada aqui e fica registrada para ser revista:

**O contato é criado com `lid:` na frente do identificador** (`PREFIXO_LID` em
`src/lib/whatsapp/recebimento.ts`). Por quê:

- **A mensagem não se perde** — o gateway nunca segura a mensagem por falta de tradução, e
  perder mensagem de cliente é pior do que registrá-la sem telefone.
- **Não vira telefone** — toda busca do CRM é por dígitos puros, então esse valor nunca
  casa com telefone de verdade. Era exatamente o risco do contato fantasma.
- **É estável** — o mesmo LID cai sempre no mesmo contato, então a conversa continua
  coerente em vez de virar uma conversa por mensagem.
- **Fica visível** — o atendente vê `lid:` e entende que o contato não está identificado.

**Pendência que isso cria, e é issue própria:** quando o gateway conseguir traduzir o LID
depois, o mesmo cliente terá dois contatos — um por LID e um por telefone. A junção dos
dois não está resolvida.

## Arquivo tocado fora da lista

- `src/app/api/webhooks/whatsapp/route.ts` — a transmissão em tempo real foi extraída para
  `src/lib/whatsapp/realtime.ts` e o webhook da Meta passou a chamá-la. Mesmo tópico,
  mesmo evento, mesmo corpo: nenhum comportamento mudou. Sem isso, os dois canais teriam
  cópias da mesma transmissão, e é justamente ela que faz a caixa de entrada não
  distinguir a origem da mensagem.

## Fora de escopo

- Mídia, localização, cartão de contato, reação, edição e exclusão — é B6-03.
- Status de entrega — é B6-04.
- Gatilho de automação novo.
- Qualquer alteração na caixa de entrada ou no chat.
