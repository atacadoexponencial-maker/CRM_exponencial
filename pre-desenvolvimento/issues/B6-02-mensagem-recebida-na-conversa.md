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

- [ ] Receber evento de mensagem recebida e registrá-la na conversa do contato
- [ ] Criar o contato automaticamente quando a mensagem vem de número desconhecido
- [ ] Criar a conversa automaticamente quando não há conversa aberta
- [ ] Disparar as automações existentes a partir de mensagem recebida por este canal

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

- [ ] Mensagem de texto de número desconhecido cria contato, abre conversa e grava a
      mensagem, com o mesmo resultado visível que a mesma mensagem pela Meta produz.
- [ ] Mensagem de número já conhecido com conversa aberta reusa a conversa e incrementa
      `unread_count`.
- [ ] `messages.wamid` recebe o `message_id` do gateway.
- [ ] A caixa de entrada mostra a mensagem em tempo real, sem recarregar a página.
- [ ] Abrir conversa nova dispara as automações de `conversa_criada`; mensagem em
      conversa já aberta **não** dispara nada (igual à Meta hoje).
- [ ] Evento com `from_is_lid: true` **não** cria contato com o LID como telefone, e a
      mensagem não é perdida.
- [ ] `reply_to` preenchido grava `reply_to_id` e `reply_preview_text`.
- [ ] Nada em `src/app/api/webhooks/whatsapp/route.ts` mudou de comportamento.

## Fora de escopo

- Mídia, localização, cartão de contato, reação, edição e exclusão — é B6-03.
- Status de entrega — é B6-04.
- Gatilho de automação novo.
- Qualquer alteração na caixa de entrada ou no chat.
