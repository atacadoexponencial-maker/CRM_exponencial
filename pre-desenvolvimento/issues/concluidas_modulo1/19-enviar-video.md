# 19: Anexar e Enviar Vídeo

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o upload e envio de vídeo via botão de anexar: o usuário seleciona o arquivo, o sistema faz upload e envia via API do WhatsApp, exibindo o vídeo no histórico da conversa.

## Cenários

### Happy Path
1. Usuário clica no botão Paperclip (dropdown) e escolhe "Vídeo"
2. Seletor de arquivo nativo abre aceitando MP4 e 3GPP (≤ 16 MB)
3. Usuário seleciona um arquivo
4. Balão otimista aparece com blob URL do vídeo (`<video>` com controles)
5. Server Action faz upload para o bucket `chat-attachments` (já existente)
6. Obtém a URL pública do arquivo
7. Chama a Meta API com `type: "video"` e `video.link`
8. Salva na tabela `messages` com `type: "video"` e `content: <url pública>`
9. Balão exibe player de vídeo nativo com a URL do Storage

### Edge Cases
- Usuário cancela o seletor → nenhuma ação
- Arquivo maior que 16 MB → erro exibido antes do envio, sem chamar o servidor
- Tipo inválido → `accept` no input restringe; validação extra no servidor rejeita

### Cenário de Erro
- Upload ao Supabase Storage falha → balão fica com status "falhou"
- Meta API rejeita o vídeo → idem, status "falhou"

## Banco de Dados

Nenhuma migração necessária. O bucket `chat-attachments` foi criado na issue 17. A coluna `content` da tabela `messages` armazena a URL pública; `type` já suporta `"video"`.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `enviarVideo(conversaId, formData)` seguindo o mesmo padrão de `enviarImagem` e `enviarDocumento`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar `videoInputRef`, estado `enviandoVideo`, `handleAnexarVideo`, e item "Vídeo" no dropdown do Paperclip
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — atualizar `case "video":`: quando `conteudo` começa com `http` ou `blob:`, renderizar `<video controls>` em vez do placeholder com ícone Play

> Sem nova migration — mesmo bucket `chat-attachments` da issue 17.

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Adicionar `enviarVideo(conversaId: string, formData: FormData): Promise<void>` em `actions.ts`: valida MIME type (`video/mp4`, `video/3gpp`), valida tamanho (≤ 16 MB), faz upload ao bucket `chat-attachments`, chama Meta API com `type: "video"` e `video.link`, insere mensagem com `type: "video"` e `content: publicUrl`, atualiza conversa com `last_message_text: "🎥 Vídeo"`
- [x] Em `painel-conversa.tsx`: adicionar `videoInputRef` e estado `enviandoVideo`; adicionar `handleAnexarVideo` (valida tamanho ≤ 16 MB, balão otimista com blob URL, chama `enviarVideo`, trata erro); adicionar `<input type="file" accept="video/mp4,video/3gpp" hidden>` com `ref={videoInputRef}`
- [x] Em `painel-conversa.tsx`: adicionar item "Vídeo" no `DropdownMenuContent` do Paperclip (após "Documento"), incluir `enviandoVideo` na condição `disabled` do trigger
- [x] Em `balao-mensagem.tsx`: no `case "video":`, se `conteudo` começa com `http` ou `blob:`, renderizar `<video src={...} controls className="w-48 rounded-lg" />`; manter placeholder existente como fallback
