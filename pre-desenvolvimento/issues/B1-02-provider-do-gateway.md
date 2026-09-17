# B1-02: Provider do gateway

**Tipo:** Implementação
**Módulo:** B1 — Camada de Provider
**Repositório:** `CRM_exponencial`

## Contexto

A B1-01 criou a camada de provider e plugou nela a única implementação existente, a da
API Oficial da Meta (`src/lib/whatsapp/provider-meta.ts`). O seletor
`resolverProvider` sempre devolve a Meta, e `whatsapp_connections` não tem como
distinguir um número da Meta de um número do canal direto.

Esta issue entrega a segunda peça: a implementação que fala com o gateway próprio, e a
escolha entre as duas. É o pré-requisito de todas as issues de B6, B7 e B8 — enquanto
ela não existir, não há canal direto para receber nem para enviar.

O contrato do gateway está congelado em
`whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`. Alterá-lo exige aviso prévio;
implementar contra ele, não.

## O que construir

1. **Coluna de canal em `whatsapp_connections`**, mais os campos que uma conexão do
   gateway precisa: identificador da instância e credencial dela. Conexões existentes
   passam a valer como `meta`.
2. **Provider do gateway** (`src/lib/whatsapp/provider-gateway.ts`), implementando o
   mesmo contrato `ProviderWhatsApp` que o provider Meta já implementa, contra os
   endpoints de envio do gateway.
3. **Seletor com dois caminhos**: `resolverProvider` passa a olhar o canal da conexão e
   devolver a implementação correspondente, sem que nenhum arquivo de negócio saiba
   qual foi.

## Comportamentos da spec cobertos

Da spec do bloco B1. A B1-01 os entregou apenas para a Meta; esta issue os completa
para os dois canais.

- [x] Resolver qual provider usar a partir do número de origem da mensagem
- [x] Enviar mensagem de texto por qualquer provider
- [x] Enviar mídia por qualquer provider
- [x] Marcar conversa como lida por qualquer provider
- [x] Verificar existência de número por qualquer provider
- [x] Informar quais recursos o provider em uso suporta
- [x] Devolver erro claro quando a operação não é suportada pelo provider em uso

## Contrato do gateway

Endpoints usados (seção 4.3 do contrato):

| Operação do contrato do CRM | Endpoint |
|---|---|
| `enviarTexto` | `POST /v1/instances/{id}/messages` com `type: "text"` |
| `enviarMidia` | `POST /v1/instances/{id}/messages` com `type: image\|video\|audio\|voice\|document\|sticker` e `media_url` |
| `marcarComoLida` | `POST /v1/instances/{id}/read` com `{ to }` |
| verificar número | `GET /v1/instances/{id}/contacts/{phone}` → `{ exists }` |

Pontos do contrato que mudam o desenho, e não são negociáveis:

- **A mídia vai por URL, não por upload.** O CRM manda `media_url` apontando para o
  arquivo que já está no Supabase Storage; o gateway baixa de lá.
- **Todo envio é enfileirado.** A resposta é
  `{ message_id, queued: true, queue_position, estimated_send_at }`. `queued: true`
  significa aceita, não enviada — a confirmação real chega pelo evento
  `message.status` (B6). O `message_id` devolvido grava em `messages.wamid`, igual ao
  `wamid` da Meta, sem migration.
- **Credenciais:** `X-Instance-Token` para tudo que se refere a um número;
  `X-Gateway-Service-Key` só para criar e listar instâncias (não é usada aqui).
- **`templates` não existe no canal direto:** `suporta("templates")` devolve `false`,
  e `suporta("midia")` e `suporta("marcar_lida")` devolvem `true`.
- **Erros** vêm como `{ error: { code, message } }`. Os `code` que esta issue precisa
  traduzir em recusa legível: `instance_not_connected`, `instance_banned`,
  `instance_braked`, `recipient_not_on_whatsapp`, `media_too_large`,
  `media_type_unsupported`, `invalid_credentials`, `instance_forbidden`.
  `message` é legível e pode chegar ao atendente.

## Arquivos

> Esta issue é a **dona da migration** de `whatsapp_connections`. B2-02, B4-02 e B6-01
> dependem dela e não criam migration própria na mesma tabela.

- **Criar:** `supabase/migrations/` — nova migration em `whatsapp_connections`: canal
  da conexão (`meta` ou `gateway`, com as linhas de hoje valendo como `meta`),
  identificador da instância e credencial da instância. As colunas da Meta
  (`waba_id`, `phone_number_id`, `access_token`) passam a ser opcionais para conexões
  do gateway — hoje são todas `not null`
  (`supabase/migrations/20260426000002_create_whatsapp_connections.sql`).
- **Criar:** `src/lib/whatsapp/provider-gateway.ts` — único arquivo do CRM que conhece
  os caminhos `/v1/instances/...`, no mesmo espírito do `provider-meta.ts`, que é o
  único que conhece `graph.facebook.com`.
- **Modificar:** `src/lib/whatsapp/index.ts` — o seletor passa a ler o canal da conexão
  e a escolher a implementação. A assinatura pública
  `resolverProvider(supabase, workspaceId)` não muda.
- **Modificar:** `src/lib/whatsapp/tipos.ts` — só se algum tipo novo for necessário. O
  contrato `ProviderWhatsApp` **não muda**: B6, B7 e B8 são escritas contra ele.
- **Modificar:** `src/lib/whatsapp/README.md` — a seção "como plugar um terceiro
  provider" deixa de ser hipotética.
- **Modificar:** `src/integrations/supabase/types.ts` — regerado, não editado à mão
  (`supabase gen types typescript --linked`).
- **Criar:** teste em `src/test/` — no padrão de `src/test/whatsapp-provider.test.ts`,
  com banco mockado, conforme `pre-desenvolvimento/testes/plano-testes-B1.md`.

Variáveis de ambiente novas, todas **só no backend**: endereço base do gateway e
credencial de serviço. A credencial de instância vive no banco, por conexão, nunca no
código nem no navegador.

## Depende de

- B0-01 — cliente HTTP e credenciais do gateway. **Bloqueante:** o provider fala pelo cliente,
  não com `fetch` próprio.
- B1-01 — concluída e integrada em 17/09/2026.
- Gateway no ar em algum endereço alcançável. Para desenvolvimento, o gateway roda
  local ou por túnel; o repo do gateway documenta isso.

## Critérios de aceite

- [x] Uma conexão marcada como `gateway` faz `resolverProvider` devolver o provider do
      gateway; uma marcada como `meta`, o da Meta. Nenhum arquivo de negócio muda.
- [x] As sete chamadas de negócio da B1-01 continuam funcionando sem alteração, porque
      só conhecem o contrato.
- [x] `suporta("templates")` é `false` no gateway e `true` na Meta.
- [x] Recusa do gateway vira `{ ok: false, motivo }` com texto legível, e não exceção.
- [x] Falha de rede **não** é capturada pelo provider: a exceção sobe, como no provider
      Meta (decisão 5.5 da B1-01).
- [x] O `message_id` devolvido pelo gateway é gravado em `messages.wamid`.
- [x] Nenhuma credencial do gateway aparece em código de cliente nem em resposta de
      Server Action.
- [x] `npm run build`, `npm run lint` e os testes passam.

## Desvio registrado na execução (17/09/2026)

**`marcarComoLida` mudou de assinatura**, de `(mensagemId: string)` para
`(alvo: AlvoDeLeitura)`, com `mensagemId` e `destino`. A issue dizia que o contrato
`ProviderWhatsApp` não mudaria, e mudou — com motivo:

a Meta confirma leitura de **uma mensagem** (`message_id`); o gateway confirma **a
conversa** (`to`). Nenhum dos dois identificadores deriva o outro. Manter só `mensagemId`
faria o gateway mandar o recibo de leitura para o contato errado, silenciosamente.

Custo real: **zero**. A operação não tinha chamador nenhum no CRM — o primeiro nasce na
B7, que é escrita depois desta. Os dois testes que a exercitavam foram ajustados.

## Fora de escopo

- Criar instância, parear por QR Code e desconectar número — é B2.
- Receber eventos do gateway — é B6.
- Escolher número de origem por conversa ou por campanha — é B7.
- Configurar ritmo de envio — é B5.
