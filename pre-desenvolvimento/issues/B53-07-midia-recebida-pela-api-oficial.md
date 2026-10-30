# B53-07: Mídia recebida pela API Oficial aparece no Chat

**Tipo:** Implementação
**Página:** Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O webhook da Meta passa a baixar a mídia recebida (imagem, áudio, vídeo, documento e figurinha), guardar no armazenamento da empresa e gravar a mensagem com o tipo certo, como o canal direto já faz.

## Pronto quando

Imagem, áudio, PDF e vídeo mandados ao número da API Oficial aparecem e abrem no Chat.

## Critérios de aceite

- **CA-B53-12** (automática) — Mídia da Meta vira mídia no Chat. Dado um aviso de mensagem recebida da Meta com imagem e legenda, quando o CRM o recebe, então a mensagem fica gravada como imagem, com o arquivo guardado no armazenamento da empresa e a legenda como texto (o mesmo vale para áudio, vídeo, documento com nome e figurinha).
- **CA-B53-13** (automática) — Falha ao baixar não deixa balão vazio. Dado um aviso de mídia cujo download na Meta falha, quando o CRM o recebe, então a mensagem é gravada e o balão mostra "Mídia não pôde ser carregada".
- **CA-B53-31** (automática) — Vídeo HEVC recebido vira H.264. Dado um vídeo HEVC (o padrão do iPhone) recebido pela API Oficial e já guardado, quando a conversão termina, logo depois de a mensagem aparecer, então o arquivo guardado passa a ser H.264 (que o Chrome toca), a mensagem deixa de ser marcada como HEVC, e se a conversão falhar o original continua no lugar.
- **CA-B53-34** (automática) — Vídeo HEVC chega como no WhatsApp. Dado um vídeo HEVC recebido pela API Oficial, com a conversa aberta, quando o CRM o guarda, então o navegador que toca HEVC mostra o original na hora; o que não toca mostra a capa (o primeiro quadro) com "Preparando o vídeo…" e, quando a conversão termina (em até 720p, no preset mais rápido), o vídeo substitui a capa sozinho, sem recarregar.
- **CA-B53-35** (manual) — Vídeo do iPhone toca sem recarregar no Chrome. Dado a conversa do celular de teste aberta no Chrome do Windows, quando o celular manda um vídeo do iPhone ao número da API Oficial, então a capa aparece em poucos segundos e o vídeo passa a tocar com imagem em até cerca de 15 segundos, sem recarregar.
- **CA-B53-14** (manual) — Mídia recebida aparece no Chat pela API Oficial. Dado o número +55 11 95504-6911, quando o contato manda imagem, áudio, PDF e vídeo, então os quatro aparecem no Chat e abrem.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A Meta avisa uma mensagem recebida do tipo `image`, `video`, `audio`, `document` ou `sticker`, com o `id` da mídia (e `mime_type`, `caption`, `filename` quando houver).
2. O webhook pede o endereço da mídia à Meta (`GET https://graph.facebook.com/v21.0/<media_id>`, `Authorization: Bearer <access_token da conexão>`), que devolve `url` (vale 5 minutos) e `mime_type`.
3. Baixa o arquivo nesse endereço com o mesmo cabeçalho, com o mesmo limite de tamanho e de tempo do canal direto, e guarda no bucket `chat-attachments`, em `{workspace}/recebidas/<agora>-<uuid>.<extensão>` (o mesmo caminho do canal direto, para o link assinado da B49 valer).
4. Grava a mensagem com o tipo do CRM (`imagem`, `video`, `audio`, `documento`, `figurinha`), o endereço do arquivo em `content`, o tipo do arquivo em `media_mime_type`, o nome do documento em `media_filename` e a legenda em `media_caption`, como o canal direto.
5. A prévia da conversa segue a do canal direto (legenda da foto e do vídeo; "📄 nome" do documento; "🎤 Áudio", "🏷️ Figurinha"...). A transmissão ao vivo leva os mesmos campos de mídia.

### Edge Cases
- Webhook que já traz `url` na mídia e não traz `id`: baixa direto dessa `url`, com o token.
- Mídia sem `mime_type`: usa o `Content-Type` da resposta; tipo fora da lista do canal direto vira download genérico (`.bin`), como lá.
- As automações continuam vendo o tipo e a legenda, como hoje.

### Cenário de Erro
- Conexão sem `access_token`, Meta respondendo erro no endereço ou no download, arquivo acima de 100 MB, tempo esgotado ou falha ao subir no Storage: a mensagem é gravada com o tipo da mídia e `content` = "Mídia não pôde ser carregada", que o balão do Chat mostra no lugar do arquivo. A legenda e o nome do documento ficam gravados igual.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-12 | automática | `src/test/webhook-whatsapp-midia.integration.test.ts` | imagem com legenda vira mensagem `imagem`, com `content` apontando para o arquivo em `chat-attachments/{workspace}/recebidas/` (que existe e tem os bytes baixados) e `media_caption` = legenda; áudio, vídeo, documento (com `media_filename`) e figurinha também |
| CA-B53-13 | automática | `src/test/webhook-whatsapp-midia.integration.test.ts` e `src/test/balao-midia-nao-carregada.test.tsx` | com a Meta respondendo erro, a mensagem é gravada com o tipo da mídia e `content` = "Mídia não pôde ser carregada"; e o balão do Chat mostra esse texto |
| CA-B53-31 | automática | `src/test/conversao-de-video-recebido.test.ts` | vídeo HEVC guardado é trocado pelo convertido no mesmo caminho, com tipo `video/mp4`, e a mensagem passa a `video/mp4`; vídeo que não é HEVC não é convertido; conversão que falha deixa o original e o tipo como estavam |
| CA-B53-34 | automática | `src/test/conversao-de-video-recebido.test.ts` e `src/test/video-hevc-na-tela.test.tsx` | a capa sai e é transmitida antes do vídeo; 1080×1920 vira 720×1280 em H.264; o balão mostra a capa com "Preparando o vídeo…" ou o original quando o navegador toca HEVC; o aviso troca o balão no lugar |
| CA-B53-35 | manual | roteiro abaixo | capa em segundos e vídeo tocando sem recarregar |
| CA-B53-14 | manual | roteiro abaixo | os quatro tipos aparecem no Chat e abrem |

### Roteiro manual — CA-B53-35
1. Abra no Chrome do Windows a conversa do celular de teste com o número da API Oficial.
2. Do iPhone, mande um vídeo gravado na câmera.
3. Sem recarregar: a capa aparece com "Preparando o vídeo…" e, em até cerca de 15 segundos, o vídeo toca com imagem.

### Roteiro manual — CA-B53-14
1. Com a B53-07 no ar, de um celular, mande ao número +55 11 95504-6911 (API Oficial) uma imagem com legenda, um áudio gravado, um PDF e um vídeo.
2. Abra a conversa no Chat do CRM.
3. A imagem aparece e amplia ao clicar; o áudio toca; o PDF aparece com o nome do arquivo e baixa; o vídeo toca.

## Banco de Dados

Nenhuma mudança. Usa as colunas que o canal direto já grava em `messages` (`type`, `content`, `media_mime_type`, `media_filename`, `media_caption`) e o bucket `chat-attachments`.

## Arquivos

- **Modificar:** `src/lib/whatsapp/midia-recebida.ts` — separa a parte que guarda no Storage e acrescenta `guardarMidiaDaMeta` (pede o endereço à Meta, baixa com o token e guarda no mesmo caminho)
- **Modificar:** `src/lib/whatsapp/mensagem-meta.ts` — o tipo `MensagemMeta` ganha os campos de mídia (`id`, `mime_type`, `url`, áudio e figurinha) e `midiaDaMensagemMeta` devolve o que baixar
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — mídia recebida é baixada e gravada com o tipo e os campos de mídia; falha grava "Mídia não pôde ser carregada"
- **Criar:** `src/test/webhook-whatsapp-midia.integration.test.ts` — CA-B53-12 e CA-B53-13 no banco de teste, com o `fetch` da Meta simulado
- **Criar:** `src/test/balao-midia-nao-carregada.test.tsx` — CA-B53-13 na tela: o balão de cada tipo de mídia mostra o aviso

- **Criar:** `src/lib/whatsapp/conversao-de-video.ts` — CA-B53-31: converte HEVC para H.264 com o ffmpeg (mesmos parâmetros do gateway, `src/midia/conversao.ts`: libx264, veryfast, crf 26, yuv420p, aac, faststart; até 50 MB) e troca o arquivo e o tipo da mensagem
- **Modificar:** `src/lib/whatsapp/midia-recebida.ts` — `MidiaGuardada` passa a levar o `caminho` no Storage
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — vídeo HEVC gravado agenda a conversão com `after()`, depois da resposta à Meta
- **Modificar:** `next.config.ts` — `ffmpeg-static` fora do bundle e o binário incluído na função do webhook
- **Modificar:** `package.json` — dependência `ffmpeg-static` (5.3.0, exata) e `allowScripts` liberando o script dela, que baixa o binário (o npm 11 da Vercel pula script de dependência sem essa liberação); o `build` roda o mesmo instalador antes do `next build`, porque o cache da Vercel traz as dependências prontas e o script não roda de novo (o instalador pula quando o binário já existe)
- **Modificar:** `package-lock.json` — a mesma dependência travada
- **Criar:** `src/test/conversao-de-video-recebido.test.ts` — CA-B53-31 e CA-B53-34 (servidor)
- **Criar:** `src/test/video-hevc-na-tela.test.tsx` — CA-B53-34 (tela)
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — vídeo HEVC: original se o navegador toca, senão a capa com "Preparando o vídeo…" e "Baixar original"
- **Modificar:** `src/app/(auth)/chat/mensagens-locais.ts` — `aplicarMensagemRecebida`: mensagem repetida do tempo real atualiza o balão no lugar
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — usa `aplicarMensagemRecebida`
- **Modificar:** `src/test/chat-figurinha-e-video-hevc.test.tsx` — o balão HEVC agora mostra "Preparando o vídeo…" no lugar do aviso da B19-04

Reuso: `tipoGuardado`, `lerComLimite`, `mimeComCodec`, `LIMITE_DA_MIDIA_EM_BYTES` e `TEMPO_LIMITE_DA_MIDIA_MS` (`midia-recebida.ts`); `traduzirConteudo` e `TIPOS_COM_ARQUIVO` (`recebimento.ts`) para tipo e prévia; `BalaoMensagem` já mostra o texto do `content` quando ele não é endereço.

## Checklist

- [x] `guardarMidiaDaMeta` em `midia-recebida.ts`, reaproveitando o caminho do Storage do canal direto
- [x] `midiaDaMensagemMeta` e os campos de mídia em `mensagem-meta.ts`
- [x] Webhook grava a mídia com tipo, arquivo, nome e legenda; falha grava o aviso
- [x] Testes do CA-B53-12 e CA-B53-13
- [x] CA-B53-31: conversão do vídeo HEVC recebido para H.264 (`conversao-de-video.ts`, `after()` no webhook, `ffmpeg-static` na função)
- [x] Teste do CA-B53-31
- [x] CA-B53-34: capa primeiro, conversão rápida até 720p, troca sozinha na conversa aberta, original direto no navegador que toca HEVC
- [x] Testes do CA-B53-34
