<!--
  CÓPIA. O original vive em `atacadoexponencial-maker/whatsapp-gateway`, em
  `pre-desenvolvimento/contrato-v1.md`, e é a fonte de verdade.

  Copiado em 17/09/2026, do commit que acrescentou a seção 4.5 (saúde, perfil de
  ritmo e retomada do freio).

  Alteração no contrato parte SEMPRE do repositório do gateway. Quem alterar lá
  avisa quem toca a Parte B e atualiza esta cópia; ninguém edita este arquivo
  diretamente. Divergência entre os dois: o do gateway vale.
-->

# Contrato Gateway ↔ CRM — v1

> **Status: congelado.** A Parte B do CRM (issues B1, B6, B7 e B8) é implementada
> contra este documento, em outro repositório e possivelmente por outra pessoa.
> Alterar qualquer coisa aqui exige aviso explícito à Parte B — ver
> [Versionamento](#versionamento).

> **Histórico de acréscimos em `v1`:**
> - **17/09/2026** — seção 4.5 (saúde, perfil de ritmo e retomada do freio) e três
>   `error.code` novos. Acréscimo não quebrante, pedido pelos blocos B4 e B5 do CRM
>   (issue `B4-00` no `CRM_exponencial`). **Avisar quem toca a Parte B.**

## Princípio

Onde este contrato tem liberdade de escolha, ele **imita o webhook da API Oficial da
Meta**. O CRM já processa aquele formato em `src/app/api/webhooks/whatsapp/route.ts`;
espelhá-lo faz o receptor de eventos do gateway (issue B6) ser um adaptador fino em
vez de um tradutor, e mantém a camada de provider (B1) com um caminho só.

Consequências diretas:

- Status de mensagem em inglês (`sent`, `delivered`, `read`, `failed`) — o CRM já tem
  o mapeamento para `entregue`/`lido`/`falhou`.
- Assinatura HMAC-SHA256 sobre o corpo bruto, com prefixo `sha256=` — o CRM já tem a
  função de validação.
- Tipos de mensagem no vocabulário da Meta (`text`, `image`, …) — a tradução para
  `texto`, `imagem` fica no CRM, onde já existe.
- O identificador de mensagem cabe na coluna `messages.wamid` que já existe, sem
  migration.

---

## 1. Autenticação

Duas credenciais, com finalidades distintas. Nenhuma delas chega ao navegador: vivem
em variável de ambiente no backend do CRM.

| Credencial | Header | Quem usa | Para quê |
|---|---|---|---|
| Serviço | `X-Gateway-Service-Key` | backend do CRM | criar instância, listar instâncias de um workspace |
| Instância | `X-Instance-Token` | backend do CRM | tudo que se refere a **um** número específico |

Regras:

- Chamada sem credencial válida → `401` com `error.code = invalid_credentials`.
- Chamada com token de instância que **não pertence** à instância no caminho → `403`
  com `error.code = instance_forbidden`. Este é o comportamento que garante o
  isolamento entre workspaces (issue A9-01).
- A credencial de serviço **não** substitui a de instância. Ela cria e lista; não
  envia, não pareia, não remove.

---

## 2. Envelope de evento

Todo evento entregue ao CRM tem a mesma casca:

```json
{
  "event_id": "evt_01HZX9M4K2QWERTY",
  "type": "message.received",
  "instance_id": "inst_01HZX8P7A3",
  "timestamp": "2026-09-10T14:32:07.412Z",
  "data": { }
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `event_id` | string | único e estável. **A mesma entrega repetida carrega o mesmo `event_id`** — é como o CRM ignora evento já processado (A7-03 reenvia) |
| `type` | string | um dos quatro da seção 3 |
| `instance_id` | string | ocupa o lugar que `phone_number_id` ocupa no webhook da Meta: é por ele que o CRM resolve o workspace |
| `timestamp` | string | ISO 8601 em UTC, do momento do fato, não da entrega |
| `data` | objeto | conteúdo específico do tipo |

### Assinatura

Header: `X-Gateway-Signature-256: sha256=<hex>`

O valor é `HMAC-SHA256(corpo_bruto, GATEWAY_WEBHOOK_SECRET)`, hexadecimal minúsculo.
O CRM valida sobre o **corpo bruto**, antes de qualquer parse, comparando em tempo
constante.

É o mesmo esquema que a Meta usa em `X-Hub-Signature-256`, de propósito: a função
`assinaturaValida()` que já existe no CRM serve com a troca do header e do segredo.

O CRM responde `2xx` para confirmar recebimento. Qualquer outra resposta faz o
gateway reenfileirar (A7-03), **exceto `401`** — assinatura inválida não melhora com
repetição, então o gateway registra a falha e para.

### Ordem

A ordem é garantida **por conversa**, não globalmente. Eventos de conversas
diferentes podem chegar em paralelo e fora de ordem entre si.

---

## 3. Eventos

### 3.1 `message.received`

```json
{
  "message_id": "3EB0C767D26B8F3A1B",
  "from": "5511999998888",
  "from_is_lid": false,
  "to": "5511777776666",
  "type": "text",
  "text": "Bom dia, tem no atacado?",
  "reply_to": null,
  "media": null,
  "location": null,
  "contact": null,
  "reaction": null,
  "system": null
}
```

`type` assume: `text`, `image`, `video`, `audio`, `voice`, `document`, `sticker`,
`location`, `contact`, `reaction`, `unknown`.

### `from_is_lid` — leia antes de casar o contato

O WhatsApp nem sempre entrega o número de quem escreveu. Em parte das conversas ele
entrega um **LID** (`@lid`), um identificador de privacidade que a Meta passou a usar.
O mesmo contato tem os dois, e qual chega depende de configurações do remetente.

Os dois são só dígitos, e o LID cabe na faixa do E.164 — ou seja, **um LID passa por
telefone válido sem nenhum erro aparecer**. Casar contato por ele criaria um contato
fantasma, e a conversa do cliente nunca encontraria o contato certo.

- `from_is_lid: false` → `from` é telefone. Casa com `contacts.phone_number`.
- `from_is_lid: true` → `from` é LID. **Não casa por telefone.**

O gateway traduz LID para telefone sempre que consegue; a marcação existe para o caso
que sobra, não para a regra. Mensagem nunca é segurada nem descartada por falta de
tradução: perder mensagem de cliente é pior do que entregá-la sem o telefone.

Campos condicionais por tipo:

| Tipo | Campo preenchido | Formato |
|---|---|---|
| `text` | `text` | string |
| `image`, `video` | `media` + `text` (legenda, pode ser vazia) | ver abaixo |
| `audio`, `voice` | `media` | `voice` marca gravação de voz, `audio` marca arquivo |
| `document` | `media` com `filename` | ver abaixo |
| `sticker` | `media` | ver abaixo |
| `location` | `location` | `{ latitude, longitude, name?, address? }` |
| `contact` | `contact` | `{ display_name, phones: [string] }` |
| `reaction` | `reaction` | `{ emoji, target_message_id }` — `emoji` vazio significa reação removida |
| `unknown` | nenhum | tipo não previsto; entregue para não sumir, sem quebrar o CRM |

Objeto `media`:

```json
{
  "url": "https://gateway.exemplo/v1/media/med_01HZX9.../conteudo",
  "mime_type": "image/jpeg",
  "size_bytes": 184320,
  "filename": "tabela-precos.pdf",
  "thumbnail_url": "https://gateway.exemplo/v1/media/med_01HZX9.../thumb",
  "expires_at": "2026-09-11T14:32:07Z"
}
```

> **`url` é ponto de busca, não de armazenamento.** O CRM baixa e sobe para o próprio
> Supabase Storage, gravando a URL pública em `messages.content` — exatamente o que
> `chat/actions.ts` já faz hoje. Passado `expires_at`, o endereço deixa de responder
> (A5-04).

Campo `reply_to`, quando a mensagem responde outra:

```json
{ "message_id": "3EB0...", "preview_text": "Tem sim, segue a tabela" }
```

Encaixa em `messages.reply_to_id` e `messages.reply_preview_text`, que já existem.

Campo `system`, para avisos sobre mensagens anteriores:

```json
{ "action": "edited", "target_message_id": "3EB0...", "new_text": "..." }
```

`action` assume `edited` ou `deleted`.

**Não geram evento:** mensagem de grupo e mensagem enviada pelo próprio número em
outro aparelho quando duplicada. São descartadas em silêncio no gateway (A3-01).

### 3.2 `message.status`

```json
{
  "message_id": "3EB0C767D26B8F3A1B",
  "status": "delivered",
  "error": null
}
```

`status` assume `sent`, `delivered`, `read`, `failed`. Em `failed`, `error` traz
`{ code, message }`.

O `message_id` é o mesmo devolvido no envio e grava em `messages.wamid`. O CRM já usa
essa coluna para atualizar a mensagem **e** o `campaign_recipients` do relatório de
campanha.

### 3.3 `instance.state`

```json
{
  "state": "connected",
  "phone_number": "5511777776666",
  "display_name": "Atacado Exemplo",
  "reason": null
}
```

`state` assume os seis estados de A1: `pairing`, `connecting`, `connected`,
`disconnected`, `banned`, `removed`.

`phone_number` e `display_name` vêm preenchidos a partir de `connected`. `reason`
explica transições não solicitadas — `session_closed_on_device`, `banned_by_whatsapp`,
`connection_lost`.

**Dois `disconnected` diferentes** (A10-01). O estado é o mesmo; o que muda é se o
gateway volta sozinho:

- `disconnected` com `reason: "connection_lost"` — **caiu.** O gateway tenta
  reconectar sozinho, com espera progressiva, e reabre a sessão quando reinicia.
- `disconnected` pedido por `POST /instances/{id}/disconnect` — **pausa.** A conexão
  com o WhatsApp é fechada na hora e a sessão fica guardada. O gateway **não** volta
  sozinho: nem por reconexão automática, nem quando reinicia. Esta transição é a
  resposta da própria chamada e não gera evento; quem pediu já sabe, e o motivo é
  nulo. A pausa termina com `POST /instances/{id}/reconnect` (A10-02), que volta
  com a sessão guardada, sem QR Code.

### 3.4 `instance.braked`

```json
{
  "reason": "failure_rate",
  "queued_count": 1840,
  "released": false
}
```

`reason` assume `banned`, `failure_rate`, `manual`. `released: true` marca a
liberação da instância freada. `queued_count` é quantas mensagens ficaram paradas —
é o que permite ao CRM avisar que uma campanha travou (B8).

---

## 4. Endpoints

Base: `https://<gateway>/v1`. Todo corpo é JSON.

### 4.1 Instância

| Método | Caminho | Credencial | Devolve |
|---|---|---|---|
| `POST` | `/instances` | serviço | `{ instance_id, instance_token, state }` |
| `GET` | `/instances/{id}` | instância | `{ instance_id, state, phone_number, display_name, created_at, last_connected_at }` |
| `GET` | `/instances?workspace_id=` | serviço | `{ instances: [...] }` |
| `POST` | `/instances/{id}/disconnect` | instância | `{ state: "disconnected" }` — fecha a conexão, sessão preservada, não volta sozinha (ver 3.3) |
| `POST` | `/instances/{id}/reconnect` | instância | `{ state: "connecting" }` — volta com a sessão guardada, sem QR; ver abaixo |
| `POST` | `/instances/{id}/logout` | instância | `{ state: "disconnected" }` — encerra no aparelho |
| `DELETE` | `/instances/{id}` | instância | `{ state: "removed" }` — apaga sessão, mídias e fila |

`reconnect` (A10-02) não tem corpo. Aceito em `disconnected`, pausada ou caída:
responde `connecting` na hora, e o resultado chega por `instance.state` — `connected`
com número e nome, ou `disconnected` com `session_closed_on_device` se o aparelho foi
removido pelo celular durante a pausa. Em `connected` ou `connecting`, devolve o
estado atual e não abre outra conexão. Recusa `banned` (`instance_banned`) e
instância sem sessão guardada (`no_saved_session`). Depois dele, o número volta a
ser tratado como qualquer conectado: se cair, o gateway tenta voltar sozinho.

`POST /instances` recebe `{ workspace_id, webhook_url }`. O `instance_token` é
devolvido **uma única vez**, na criação.

### 4.2 Pareamento

| Método | Caminho | Corpo | Devolve |
|---|---|---|---|
| `POST` | `/instances/{id}/pair/qr` | — | `{ qr, expires_at }` |
| `POST` | `/instances/{id}/pair/code` | `{ phone_number }` | `{ pairing_code, expires_at }` |

`qr` é o conteúdo bruto do código, não uma imagem — quem desenha é o CRM. Expirado
sem leitura, o gateway renova sozinho e entrega `instance.state` com `pairing`; o CRM
chama de novo para pegar o código atual.

### 4.3 Envio

| Método | Caminho | Corpo |
|---|---|---|
| `POST` | `/instances/{id}/messages` | ver abaixo |
| `POST` | `/instances/{id}/reactions` | `{ to, target_message_id, emoji }` |
| `POST` | `/instances/{id}/read` | `{ to }` |
| `POST` | `/instances/{id}/presence` | `{ to, state: "typing" \| "paused" }` |
| `GET` | `/instances/{id}/contacts/{phone}` | — → `{ exists: true \| false }` |

Corpo de `/messages`:

```json
{
  "to": "5511999998888",
  "type": "text",
  "text": "Segue a tabela",
  "media_url": null,
  "filename": null,
  "reply_to_message_id": null,
  "priority": "conversation"
}
```

- `type`: `text`, `image`, `video`, `audio`, `voice`, `document`, `sticker`
- `media_url`: **o CRM manda uma URL**, não o arquivo. A mídia já está no Supabase
  Storage do CRM com URL pública; o gateway baixa dali (A5-03). Evita upload duplo.
- `priority`: `conversation` ou `campaign`. É o que faz A6-06 colocar cliente
  esperando resposta na frente de disparo em massa. Ausente, assume `conversation`.

Resposta:

```json
{
  "message_id": "3EB0C767D26B8F3A1B",
  "queued": true,
  "queue_position": 12,
  "estimated_send_at": "2026-09-10T14:41:00Z"
}
```

> **Toda mensagem é enfileirada.** Não existe envio imediato, nem parâmetro para
> pular a fila. `queued: true` significa aceita, não enviada — a confirmação real
> chega depois pelo evento `message.status`.

`presence` e `read` **não** entram na fila: não são mensagem e não contam nos tetos.

### 4.4 Fila

| Método | Caminho | Devolve |
|---|---|---|
| `GET` | `/instances/{id}/queue/{message_id}` | `{ queue_position, estimated_send_at, state }` |

`state` assume `queued`, `deferred` (fora da janela de envio), `sent`, `discarded`.

---

### 4.5 Saúde e ritmo

Acrescentados em 17/09/2026 (issue `00-03`), para os blocos B4 e B5 do CRM. São
**acréscimos não quebrantes**: endpoint novo, nada mudou em `v1`.

| Método | Caminho | Credencial | Para quê |
|---|---|---|---|
| `GET` | `/instances/{id}/health` | instância | saúde, consumo dos tetos, aquecimento e freio |
| `GET` | `/instances/{id}/rate-profile` | instância | ritmo configurado, efetivo e os limites do sistema |
| `PATCH` | `/instances/{id}/rate-profile` | instância | alterar o ritmo |
| `POST` | `/instances/{id}/brake/release` | instância | retomar os envios de uma instância freada |

#### `GET /instances/{id}/health`

```json
{
  "instance_id": "inst_01HZX8P7A3",
  "state": "connected",
  "connected_24h_ms": 82800000,
  "sent": { "last_hour": 12, "last_24h": 140 },
  "received": { "last_hour": 9, "last_24h": 118 },
  "failures": { "failed": 2, "sent": 50, "ratio": 0.04 },
  "caps": { "hourly": 24, "hourly_used": 12, "daily": 200, "daily_used": 140 },
  "warmup": { "active": true, "day_of_life": 9, "hourly_cap": 24, "daily_cap": 200 },
  "brake": { "braked": false, "reason": null, "braked_at": null },
  "queue": { "queued_count": 0 }
}
```

- `caps` traz os tetos **vigentes** — já com aquecimento e limites do sistema aplicados —
  e quanto deles foi consumido. É o que o medidor da B4 desenha. Não são os valores crus
  das colunas de configuração: para esses, use `rate-profile`.
- `warmup.active` é `false` do dia 31 em diante; `day_of_life` conta períodos de 24h desde
  a primeira conexão do número atual, e o dia 1 são as primeiras 24 horas.
- `failures` é a janela dos últimos envios que alimenta o freio automático. `ratio` é
  `null` sem envios na janela.
- `queue.queued_count` é o mesmo número que `instance.braked` entrega quando freia.
- Estado de agora, não série temporal.

#### O sinal de risco é classificado no CRM

Decidido em 17/09/2026. O gateway **não** devolve "risco alto": devolve os ingredientes
que só ele tem — enviadas e recebidas por período, proporção de falhas, consumo dos tetos,
estágio de aquecimento e tempo conectada. O CRM combina isso com o que só ele tem
(quantos destinatários eram contato sem histórico, por exemplo) e aplica a régua de baixo,
médio e alto.

Motivo: a régua é regra de produto e vai mudar com a experiência dos primeiros clientes.
Se morasse aqui, cada ajuste viraria deploy do gateway, com reinício afetando todos os
números conectados.

#### `GET /instances/{id}/rate-profile`

```json
{
  "configured": {
    "send_interval_seconds": 40,
    "hourly_cap": 60,
    "daily_cap": 500,
    "send_window_start": "08:00",
    "send_window_end": "20:00"
  },
  "effective": {
    "send_interval_seconds": 40,
    "hourly_cap": 24,
    "daily_cap": 200,
    "send_window_start": "08:00",
    "send_window_end": "20:00",
    "warmup_applied": true
  },
  "system_limits": {
    "send_interval_seconds_min": 40,
    "hourly_cap_max": 60,
    "daily_cap_max": 500,
    "send_window_earliest": "08:00",
    "send_window_latest": "20:00"
  }
}
```

`configured` é o que está gravado; `effective` é o que a fila usa agora, com aquecimento e
limites aplicados; `system_limits` existe para o formulário do CRM não duplicar esses
números e sair de sincronia no primeiro ajuste. Horários em hora de São Paulo.

#### `PATCH /instances/{id}/rate-profile`

Corpo com qualquer subconjunto dos campos de `configured`:

```json
{ "send_interval_seconds": 60, "daily_cap": 300 }
```

Resposta: o mesmo objeto do `GET`, já com os valores novos.

Valor fora do limite é **recusado**, não apertado em silêncio: `422` com
`rate_profile_out_of_range`, e `message` informando o limite, para o CRM poder explicar ao
administrador. A proteção do gateway não sai: a fila continua aplicando os limites por
cima de qualquer valor gravado.

#### `POST /instances/{id}/brake/release`

Sem corpo. Libera o freio e zera a janela de resultados — sem zerar, o freio por proporção
de falhas voltaria a disparar na primeira falha seguinte, por causa das falhas que o
causaram.

```json
{ "braked": false, "released_reason": "failure_rate" }
```

- Freio com motivo `banned` **não** é liberável: `409` com `brake_not_releasable`. O
  bloqueio é do WhatsApp, e liberar a fila só produziria falha em série.
- Instância sem freio ativo: `409` com `instance_not_braked`.
- A liberação entrega `instance.braked` com `released: true` (seção 3.4), que é como o CRM
  sabe que a campanha pode voltar.

---

## 5. Erros

Toda recusa devolve o mesmo formato:

```json
{ "error": { "code": "instance_not_connected", "message": "A instância não está conectada." } }
```

`code` é estável e serve para o CRM decidir o que fazer. `message` é legível e pode
ser mostrado ao atendente.

| `code` | HTTP | Quando |
|---|---|---|
| `invalid_credentials` | 401 | credencial ausente ou inválida |
| `instance_forbidden` | 403 | token pertence a outra instância |
| `instance_not_found` | 404 | instância inexistente ou já removida |
| `instance_not_connected` | 409 | envio pedido com a instância fora do ar |
| `instance_banned` | 409 | instância marcada como banida |
| `no_saved_session` | 409 | `reconnect` sem sessão guardada; é preciso parear de novo (A10-02) |
| `instance_braked` | 409 | freio de emergência acionado (A6-07) |
| `recipient_not_on_whatsapp` | 422 | destinatário não tem WhatsApp |
| `media_too_large` | 413 | acima do teto do tipo; `message` informa o limite |
| `media_type_unsupported` | 415 | tipo que o WhatsApp não aceita |
| `workspace_instance_limit_reached` | 409 | limite de instâncias do workspace |
| `invalid_payload` | 400 | corpo malformado ou campo obrigatório ausente |
| `rate_profile_out_of_range` | 422 | valor de ritmo acima do limite do sistema; `message` informa o limite |
| `brake_not_releasable` | 409 | retomada pedida para freio por banimento |
| `instance_not_braked` | 409 | retomada pedida para instância sem freio ativo |

Fora da janela de envio **não é erro**: a mensagem é aceita e adiada, com
`state: "deferred"` (A6-04).

---

## Versionamento

A versão vive no caminho (`/v1`). Duas classes de mudança:

**Não quebrante** — pode entrar em `v1` sem aviso:
- campo novo e opcional em um evento ou resposta
- valor novo em um enum **de saída** que já tem caso de escape (`type: "unknown"`,
  `reason`)
- endpoint novo

**Quebrante** — exige `/v2` e aviso à Parte B:
- remover ou renomear campo
- mudar tipo ou semântica de campo existente
- tornar obrigatório um campo que era opcional
- valor novo em enum **de entrada** (o CRM precisa saber para mandar)
- mudar o esquema de assinatura ou de autenticação

Quem alterar este documento avisa quem toca a Parte B **antes** de publicar, mesmo
sendo mudança não quebrante.
