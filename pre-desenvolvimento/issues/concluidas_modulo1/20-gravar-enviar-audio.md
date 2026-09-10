# 20: Gravar e Enviar Mensagem de Áudio

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a gravação de áudio pelo microfone ao pressionar o botão de gravação e o envio via API do WhatsApp ao soltar, exibindo o áudio no histórico com player de reprodução.

## Cenários

### Happy Path
1. Usuário mantém o botão Mic pressionado — microfone é solicitado e gravação inicia
2. Timer exibe duração crescente durante a gravação
3. Usuário solta o botão — MediaRecorder finaliza, blob é criado
4. Mensagem otimista aparece imediatamente no balão com o player de áudio (blob URL)
5. Upload do arquivo para Supabase Storage (`chat-attachments`)
6. Meta API é chamada com `type: "audio"` e URL pública
7. Status atualizado em `messages` e `conversations`

### Edge Cases
- Usuário solta o mouse fora do botão (`onMouseLeave`) — gravação para e envia normalmente
- Touch em mobile: `onTouchStart` / `onTouchEnd` mapeados para iniciar/parar
- Gravação muito curta (< 1 segundo) — ainda envia (MediaRecorder produz blob válido)
- Permissão de microfone negada — exibe `alert("Permissão de microfone negada.")` e não inicia

### Cenário de Erro
- Falha no upload ou na Meta API — mensagem é marcada como `"falhou"` (mesmo padrão dos outros anexos)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar função `enviarAudio`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — ativar botão Mic com lógica de gravação
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — atualizar case `audio` para renderizar `<audio>` quando `conteudo` for URL

## Dependências Externas

- `MediaRecorder` (API nativa do browser) — captura áudio do microfone
- Supabase Storage bucket `chat-attachments` — já usado por imagem/documento/vídeo
- Meta WhatsApp Cloud API (`type: "audio"`) — formatos aceitos: OGG Opus, MP4, MPEG, AAC, AMR

## Checklist

- [x] Adicionar `enviarAudio(conversaId, formData)` em `actions.ts` — upload no Supabase Storage + Meta API com `type: "audio"` + insert em `messages` + update em `conversations` com `"🎤 Áudio"`
- [x] Adicionar estados `gravando`, `duracaoGravacao`, `enviandoAudio` em `painel-conversa.tsx`
- [x] Adicionar refs `mediaRecorderRef`, `audioChunksRef`, `timerRef` em `painel-conversa.tsx`
- [x] Implementar `handleIniciarGravacao` — `getUserMedia({ audio: true })`, iniciar `MediaRecorder`, iniciar `setInterval` de 1 s para `duracaoGravacao`
- [x] Implementar `handlePararGravacao` — parar `MediaRecorder`, limpar timer, aguardar evento `ondataavailable`, criar blob, mensagem otimista, chamar `enviarAudio`
- [x] Substituir botão Mic desabilitado por botão com `onMouseDown` / `onMouseUp` / `onMouseLeave` / `onTouchStart` / `onTouchEnd`
- [x] Exibir feedback visual: botão vermelho + `animate-pulse` + contador `MM:SS` durante gravação
- [x] Importar `enviarAudio` em `painel-conversa.tsx`
- [x] Atualizar case `audio` em `balao-mensagem.tsx`: se `conteudo` começa com `blob:` ou `http`, renderizar `<audio controls className="w-48" />`; caso contrário manter placeholder estático
