# B6-04: Status, estado da instância e freio

**Tipo:** Implementação
**Módulo:** B6 — Recebimento de Eventos do Gateway
**Repositório:** `CRM_exponencial`

## Contexto

Além de mensagem recebida, o gateway entrega três outros eventos: a mudança de status
de uma mensagem enviada, a mudança de estado do número conectado, e o acionamento do
freio de emergência.

Os três são pequenos e batem em lugares diferentes do CRM: o status atualiza mensagem e
relatório de campanha, o estado atualiza a conexão, e o freio precisa aparecer para
alguém — e é aí que está o problema descrito abaixo.

## O que construir

1. **Status de mensagem** atualizando `messages` e `campaign_recipients` pelo
   identificador, do mesmo jeito que o webhook da Meta faz hoje.
2. **Estado da instância** atualizando a conexão em `whatsapp_connections`, incluindo
   número e nome de exibição quando a conexão se completa.
3. **Freio** registrado como alerta para o time do workspace.

## Comportamentos da spec cobertos

- [ ] Receber evento de status e atualizar a mensagem correspondente
- [ ] Receber evento de mudança de estado da instância e atualizar o número conectado
- [ ] Receber evento de freio e registrar o alerta correspondente

## Contrato do gateway

`message.status` (seção 3.2):

```json
{ "message_id": "3EB0C767D26B8F3A1B", "status": "delivered", "error": null }
```

`status` assume `sent`, `delivered`, `read`, `failed`; em `failed`, `error` traz
`{ code, message }`. O `message_id` é o mesmo devolvido no envio e grava em
`messages.wamid` — **a mesma coluna que a Meta usa**, sem migration.

`instance.state` (seção 3.3):

```json
{ "state": "connected", "phone_number": "5511777776666",
  "display_name": "Atacado Exemplo", "reason": null }
```

`state` assume `pairing`, `connecting`, `connected`, `disconnected`, `banned`,
`removed`. `phone_number` e `display_name` vêm preenchidos a partir de `connected`.
`reason` explica transição não solicitada: `session_closed_on_device`,
`banned_by_whatsapp`, `connection_lost`.

`instance.braked` (seção 3.4):

```json
{ "reason": "failure_rate", "queued_count": 1840, "released": false }
```

`reason` assume `banned`, `failure_rate`, `manual`. `released: true` marca a liberação.
`queued_count` é quantas mensagens ficaram paradas.

## Arquivos

- **Modificar:** `src/app/api/webhooks/gateway/route.ts` — os três casos.
- **Consultar:** `src/app/api/webhooks/whatsapp/route.ts:60-79` — o mapa de status da
  Meta, que traduz `delivered → entregue`, `read → lido`, `failed → falhou`, e atualiza
  `messages.status` **e** `campaign_recipients.status` + `atualizado_em` pelo `wamid`.
  O gateway emite os mesmos termos em inglês, então **o mesmo mapa serve**. Observar
  que `sent` não está no mapa de hoje e que
  `supabase/migrations/20260612000001_create_campaigns.sql:31` limita
  `campaign_recipients.status` a `pendente, enviado, entregue, lido, falhou`.
- **Modificar:** `whatsapp_connections` — `status` hoje é texto livre com padrão
  `connected` (`supabase/migrations/20260426000002_create_whatsapp_connections.sql`).
  Os seis estados do gateway precisam caber nele, e `phone_number` e `display_name`
  são `not null` hoje, mas só ficam conhecidos quando a conexão se completa: a migration
  da B1-02 precisa ter previsto isso — confirmar no plano.
- **Decidir no plano:** onde o alerta de freio é registrado. **A central de alertas de
  hoje não serve como está:** `src/lib/alertas.ts:72` é cálculo puro sobre cards de
  pipeline (`calcularAlertas`), e `src/app/(auth)/alertas/actions.ts:70` monta a lista
  a partir desses cards com dispensas. **Não existe tabela de alertas onde inserir um
  aviso vindo de fora.** As duas saídas: criar persistência de alerta operacional, ou
  deixar o freio para o Cartão de Saúde do B4. Levar à Marcelle antes de implementar —
  é decisão de produto, e o mesmo alerta é pedido no B4 ("Receber alerta na central de
  alertas quando um número é desconectado ou banido").
- **Criar:** teste em `src/test/`, com banco mockado.

## Depende de

- B6-01 — a rota e a idempotência.
- B1-02 — as colunas de canal e de instância em `whatsapp_connections`.

## Critérios de aceite

- [ ] `delivered`, `read` e `failed` atualizam `messages.status` com os mesmos termos em
      português que a Meta produz hoje.
- [ ] Os mesmos eventos atualizam `campaign_recipients.status` e `atualizado_em`, para
      o relatório de campanha continuar correto.
- [ ] `failed` preserva o motivo de forma legível para o atendente.
- [ ] `sent` tem destino definido e não quebra a restrição de valores de
      `campaign_recipients.status`.
- [ ] `connected` grava número e nome de exibição na conexão.
- [ ] `disconnected`, `banned` e `removed` mudam o estado da conexão, e `reason` fica
      registrado.
- [ ] Freio recebido fica visível para alguém do workspace, pelo caminho decidido no
      plano, com o motivo e a quantidade parada.
- [ ] `released: true` reflete a liberação, sem duplicar alerta.
- [ ] Identificador desconhecido (status de mensagem que o CRM não tem) responde `2xx`
      sem escrever nada.

## Fora de escopo

- Cartão de saúde, medidor de consumo e sinal de risco — é B4.
- Interromper campanha automaticamente quando o número é freado — é B8.
- Tela de conexão e reconexão do número — é B2.
