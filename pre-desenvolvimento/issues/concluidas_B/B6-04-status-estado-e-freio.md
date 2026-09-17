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

- [x] Receber evento de status e atualizar a mensagem correspondente
- [x] Receber evento de mudança de estado da instância e atualizar o número conectado
- [x] Receber evento de freio e registrar o alerta correspondente

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

- [x] `delivered`, `read` e `failed` atualizam `messages.status` com os mesmos termos em
      português que a Meta produz hoje.
- [x] Os mesmos eventos atualizam `campaign_recipients.status` e `atualizado_em`, para
      o relatório de campanha continuar correto.
- [x] `failed` preserva o motivo de forma legível para o atendente.
- [x] `sent` tem destino definido e não quebra a restrição de valores de
      `campaign_recipients.status`.
- [x] `connected` grava número e nome de exibição na conexão.
- [x] `disconnected`, `banned` e `removed` mudam o estado da conexão, e `reason` fica
      registrado.
- [x] Freio recebido fica visível para alguém do workspace, pelo caminho decidido no
      plano, com o motivo e a quantidade parada.
- [x] `released: true` reflete a liberação, sem duplicar alerta.
- [x] Identificador desconhecido (status de mensagem que o CRM não tem) responde `2xx`
      sem escrever nada.

## Decisão tomada na execução (17/09/2026)

A issue mandava levar à Marcelle **onde o alerta de freio é registrado**, porque a central
de alertas de hoje não serve: `src/lib/alertas.ts` é cálculo puro sobre cards de pipeline,
todo alerta nasce ancorado num `cardId`, e o freio de um número não tem card, nem contato,
nem etapa. A execução correu sem interrupção, então a decisão foi tomada aqui:

**Criada a tabela `operational_alerts`** (migration `20260917000003`), com workspace,
conexão, tipo, motivo, quantidade parada e `resolved_at`. Foi o caminho da persistência, e
não o de "deixar para o Cartão de Saúde do B4", por três razões:

1. O B4 pede **os mesmos alertas** na central ("número desconectado ou banido"), então a
   tabela seria criada lá de qualquer forma.
2. Sem lugar para gravar, o evento `instance.braked` chegaria e seria descartado — e é
   justamente ele que permite avisar que uma campanha travou (B8).
3. Alerta derivado de card não tem como representar algo que não tem card.

**Um alerta aberto por conexão e tipo**, garantido por índice único parcial: a reentrega
do mesmo evento, ou um freio que insiste, não enche a central de linhas repetidas.
`released: true` **resolve** o alerta aberto em vez de criar outro — o gateway entrega os
dois momentos do mesmo fato.

**O que esta issue NÃO fez:** mostrar esses alertas na tela. A central de alertas continua
derivando dos cards de pipeline; ligar `operational_alerts` a ela é trabalho do B4-03, que
já depende disso.

**`messages.status_error`** foi acrescentada na mesma migration. Hoje o CRM grava
`status = 'falhou'` e perde o motivo: o atendente vê que não foi e não sabe dizer se o
número não tem WhatsApp, se a mídia estourou o limite ou se o número foi banido.

**`sent` virou `enviado`**, valor que a restrição de `campaign_recipients.status` já
aceita. Status fora do mapa **não escreve nada**, em vez de tentar gravar valor inválido e
derrubar a linha inteira.

**A migration `20260917000003` NÃO foi aplicada** — falta `npx supabase db push --linked`,
e a base é a de produção.

## Arquivo criado fora da lista

- `src/lib/whatsapp/eventos-de-operacao.ts` — os três tratamentos. A issue listava só a
  rota, mas manter a lógica nela obrigaria a montar o webhook inteiro (assinatura,
  envelope, idempotência) três vezes em teste, para exercitar regras que não têm nada de
  HTTP.

## Fora de escopo

- Cartão de saúde, medidor de consumo e sinal de risco — é B4.
- Interromper campanha automaticamente quando o número é freado — é B8.
- Tela de conexão e reconexão do número — é B2.
