# 17: Anexar e Enviar Imagem

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o upload e envio de imagem via botão de anexar: o usuário seleciona o arquivo, o sistema faz upload e envia via API do WhatsApp, exibindo a imagem no histórico da conversa.

## Cenários

### Happy Path
1. Usuário clica no botão Paperclip (atualmente desabilitado)
2. Abre seletor de arquivo nativo do OS (aceita apenas imagens)
3. Usuário seleciona um arquivo de imagem (JPEG, PNG ou WebP, ≤ 5 MB)
4. Balão otimista aparece na conversa com placeholder "Enviando..."
5. Server Action faz upload para o bucket `chat-attachments` no Supabase Storage
6. Obtém a URL pública do arquivo
7. Chama a Meta API com `type: "image"` e `image.link: <url pública>`
8. Salva na tabela `messages` com `type: "imagem"` e `content: <url pública>`
9. Balão otimista é substituído pelo `<img>` real com a URL

### Edge Cases
- Usuário cancela o seletor sem escolher arquivo → nenhuma ação
- Arquivo maior que 5 MB → erro exibido antes do envio, sem chamar o servidor
- Tipo de arquivo inválido (PDF, vídeo, etc.) → `accept="image/*"` bloqueia no input; validação extra no servidor

### Cenário de Erro
- Upload ao Supabase Storage falha → balão fica com status "falhou", texto de erro no console; usuário pode tentar novamente
- Meta API rejeita a imagem → idem, status "falhou"

## Banco de Dados

- Nenhuma migração de schema necessária — coluna `content` da tabela `messages` já armazena a URL; campo `type` já suporta `"imagem"`.
- **Nova migração de storage:** bucket `chat-attachments` (público) com política de insert para autenticados.

## Arquivos

- **Criar:** `supabase/migrations/20260503000003_storage_chat_attachments.sql` — cria bucket público e políticas de storage
- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `enviarImagem(conversaId, formData)` seguindo o mesmo padrão de `enviarMensagem`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — habilitar botão Paperclip, adicionar `<input type="file" hidden>` e lógica de seleção/upload
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — renderizar `<img>` real para `tipo === "imagem"` (atualmente exibe placeholder com ícone Film)

## Dependências Externas

Nenhuma nova — Supabase JS SDK (já instalado) já possui cliente de storage.

## Checklist

- [x] Criar migration `supabase/migrations/20260503000003_storage_chat_attachments.sql` com bucket `chat-attachments` público e políticas RLS de storage
- [x] Adicionar `enviarImagem(conversaId: string, formData: FormData): Promise<void>` em `actions.ts` usando `createServiceClient()` para upload e `createClient()` para DB/WhatsApp
- [x] Habilitar botão Paperclip em `painel-conversa.tsx` (remover `disabled` e `opacity-40 cursor-not-allowed`)
- [x] Adicionar `<input type="file" accept="image/*" hidden ref={fileInputRef}>` em `painel-conversa.tsx`
- [x] Implementar `handleAnexarImagem` em `painel-conversa.tsx`: valida tamanho (≤ 5 MB), adiciona balão otimista, chama `enviarImagem`, trata erro marcando status "falhou"
- [x] Atualizar `ConteudoMensagem` em `balao-mensagem.tsx`: se `mensagem.conteudo` começa com `http`, renderizar `<img src={...} alt="imagem" className="w-48 rounded-lg object-cover">` em vez do ícone Film
