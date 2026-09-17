# B6-03: Mídia e demais tipos recebidos

**Tipo:** Implementação
**Módulo:** B6 — Recebimento de Eventos do Gateway
**Repositório:** `CRM_exponencial`

## Contexto

A B6-02 registra mensagem de texto. Falta o resto do que um cliente manda: foto,
vídeo, áudio, gravação de voz, documento, figurinha, localização, cartão de contato,
reação, e os avisos de mensagem editada ou apagada.

**Achado importante, e é o motivo desta issue existir separada:** o webhook da Meta
hoje **só trata texto**. Em `src/app/api/webhooks/whatsapp/route.ts:45` o tipo lido do
corpo é apenas `text?: { body?: string }`, e a mensagem é gravada sempre com
`type: "texto"`. Ou seja, mídia recebida **nunca funcionou no CRM**, por nenhum canal.
A spec do B6 diz "injetar no mesmo fluxo que hoje trata os eventos da Meta", e esse
fluxo não cobre mídia — aqui o CRM ganha capacidade nova, não equivalência.

A consequência prática: o que esta issue construir é o **primeiro** tratamento de mídia
recebida do CRM, e o canal da Meta continuará sem ele até alguém abrir a issue
equivalente.

## O que construir

1. **Tradução de tipo**, do vocabulário do gateway para o do CRM.
2. **Trazer a mídia para dentro do CRM**: baixar do endereço temporário do gateway e
   subir para o Supabase Storage, gravando a URL pública, do jeito que o envio de mídia
   do chat já faz.
3. **Registro dos tipos sem arquivo**: localização, cartão de contato.
4. **Reação, edição e exclusão**, que não criam mensagem nova — alteram uma existente.
5. **Tipo desconhecido** registrado sem quebrar.

## Comportamentos da spec cobertos

Nenhum comportamento próprio: esta issue completa o comportamento
"Receber evento de mensagem recebida e registrá-la na conversa do contato", declarado
na B6-02, para os tipos que não são texto. Separada porque o trabalho é de natureza
diferente — download, armazenamento e alteração de mensagem existente.

## Contrato do gateway

Evento `message.received` (seção 3.1), campos `type`, `media`, `location`, `contact`,
`reaction`, `system`.

`type` assume `text`, `image`, `video`, `audio`, `voice`, `document`, `sticker`,
`location`, `contact`, `reaction`, `unknown`.

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

> **`url` é ponto de busca, não de armazenamento.** O endereço vale 24h e depois deixa
> de responder. Quem armazena é o CRM, no próprio Supabase Storage, gravando a URL
> pública em `messages.content` — exatamente o que o chat já faz no envio.

Outros campos:

- `location` → `{ latitude, longitude, name?, address? }`
- `contact` → `{ display_name, phones: [string] }`
- `reaction` → `{ emoji, target_message_id }`; **`emoji` vazio significa reação
  removida**
- `system` → `{ action: "edited" | "deleted", target_message_id, new_text? }`
- `audio` é arquivo de áudio; `voice` é gravação de voz. O CRM tem um tipo só.

`messages.type` usa vocabulário em pt-BR (`texto`, `imagem`, `video`, `audio`,
`documento`) e o gateway usa o da Meta — **a tradução fica no CRM**, e é aqui.
Figurinha, localização, cartão de contato e reação **não têm valor correspondente
hoje**: definir os novos valores faz parte desta issue.

## Arquivos

- **Modificar:** o módulo de recebimento criado na B6-02, e
  `src/app/api/webhooks/gateway/route.ts` se o despacho precisar.
- **Consultar:** `src/app/(auth)/chat/actions.ts` — as funções de envio de imagem,
  documento, vídeo e áudio mostram o caminho já usado no projeto: `upload` no bucket
  `chat-attachments`, `getPublicUrl` e a URL pública gravada em `content`. O bucket
  está em `supabase/migrations/20260503000003_storage_chat_attachments.sql`.
- **Consultar:** `supabase/migrations/20260503000000_create_messages.sql` —
  `messages.type` é texto livre, sem `check`, então valor novo não exige migration;
  `content` é `not null default ''`.
- **Avaliar no plano:** se localização, cartão de contato e reação precisam de coluna
  nova ou cabem no `content`. Reação e edição alteram mensagem existente, não inserem.
- **Criar:** teste em `src/test/`, com banco mockado e o download da mídia simulado.

## Depende de

- B6-02 — o caminho de contato, conversa e mensagem.

## Critérios de aceite

- [x] Foto, vídeo, áudio, gravação de voz e documento recebidos aparecem na conversa, e
      o arquivo continua abrindo **depois** de o endereço do gateway expirar (prova de
      que foi copiado para o Storage do CRM).
- [x] Nome original do documento é preservado.
- [x] Legenda de foto e vídeo é preservada, inclusive quando vazia.
- [x] Localização e cartão de contato aparecem de forma legível na conversa.
- [x] Reação aparece associada à mensagem alvo; reação com `emoji` vazio remove a
      reação em vez de registrar uma vazia.
- [x] `system: edited` atualiza o texto da mensagem alvo; `system: deleted` a marca como
      apagada, sem apagar a linha do banco.
- [x] Alvo desconhecido (reação, edição ou exclusão de mensagem que o CRM não tem)
      responde `2xx` e não quebra.
- [x] `type: unknown` registra a mensagem sem quebrar a conversa.
- [x] Falha ao baixar a mídia não perde a mensagem: o texto e a legenda são registrados,
      e a falha fica registrada.

## Decisões tomadas na execução (17/09/2026)

A issue mandava avaliar no plano se localização, cartão de contato e reação precisavam de
coluna nova. Avaliado e decidido:

**Valores novos de `messages.type`** (a coluna é texto livre, sem `check`, então não
exigiram migration): `figurinha`, `localizacao`, `contato`, `desconhecido`. `voice` e
`audio` caem no mesmo `audio` — o WhatsApp separa gravação de voz de arquivo de áudio, o
CRM tem um tipo só, e inventar a distinção agora mudaria a caixa de entrada sem ninguém
pedir.

**Cinco colunas novas em `messages`** (migration `20260917000002`), cada uma porque não
cabia em `content`:

| Coluna | Por quê |
|---|---|
| `media_filename` | `content` guarda a URL do Storage, e o nome do arquivo lá é gerado por nós — o original se perderia |
| `media_mime_type` | para a conversa saber o que abrir |
| `media_caption` | legenda de foto e vídeo. Nullable de propósito: "sem legenda" e "legenda vazia" são estados diferentes, e o contrato manda os dois |
| `reaction_emoji` | reação pertence à mensagem alvo, não é mensagem nova. `null` é remoção |
| `edited_at` / `deleted_at` | editar e apagar alteram mensagem existente. Apagada é **marcada**: quem apaga no WhatsApp não apaga o histórico do CRM |

**Localização e cartão de contato viram texto legível** em `content`, porque nenhuma
alteração de tela entra nesta issue: a localização sai como nome, endereço e link do
Google Maps; o cartão, como nome e telefones. Aparecem na conversa sem nenhuma mudança de
UI.

**Nome de arquivo de fora não define caminho no nosso Storage.** O upload usa nome próprio
(`{workspace}/recebidas/{timestamp}-{uuid}.{ext}`), e o original fica em
`media_filename` — nome vindo de mensagem de terceiro não escolhe onde escrevemos.

**A migration `20260917000002` NÃO foi aplicada.** Falta `npx supabase db push --linked`,
e como existe uma Supabase só, a aplicação é decisão da Marcelle.

## Arquivo criado fora da lista

- `src/lib/whatsapp/midia-recebida.ts` — o download do gateway e o upload para o Storage.
  Ficou fora de `recebimento.ts` porque é a única parte que fala com o mundo externo e com
  o Storage, e é o que os testes precisam simular sem simular o resto.

## Fora de escopo

- Dar à Meta o mesmo tratamento de mídia recebida. É issue própria, e precisa ser
  criada — está registrada aqui como achado, não resolvida.
- Miniatura de vídeo quando o WhatsApp não manda (o gateway já avisou que não gera).
- Transcrição de áudio, visualização de mapa, importar cartão de contato como contato.
