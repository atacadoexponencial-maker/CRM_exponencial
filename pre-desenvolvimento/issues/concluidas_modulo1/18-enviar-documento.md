# 18: Anexar e Enviar Documento

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o upload e envio de documento (PDF, planilha, etc.) via botão de anexar: o usuário seleciona o arquivo, o sistema faz upload e envia via API do WhatsApp, exibindo o documento no histórico com botão de download.

## Cenários

### Happy Path
1. Usuário clica no botão Paperclip — agora abre um dropdown com opções "Imagem" e "Documento"
2. Usuário escolhe "Documento"
3. Seletor de arquivo nativo abre aceitando PDF, Word, Excel, PowerPoint, TXT e OpenDocument (≤ 100 MB)
4. Usuário seleciona um arquivo
5. Balão otimista aparece na conversa com o nome do arquivo e ícone de documento
6. Server Action faz upload para o bucket `chat-attachments` (já existente) com o nome original no caminho
7. Obtém a URL pública do arquivo
8. Chama a Meta API com `type: "document"`, `document.link` e `document.filename`
9. Salva na tabela `messages` com `type: "documento"` e `content: <url pública>`
10. Balão exibe nome do arquivo com ícone de download clicável

### Edge Cases
- Usuário cancela o seletor → nenhuma ação
- Arquivo maior que 100 MB → erro exibido antes do envio, sem chamar o servidor
- Tipo de arquivo inválido → `accept` no input restringe; validação extra no servidor rejeita

### Cenário de Erro
- Upload ao Supabase Storage falha → balão fica com status "falhou"
- Meta API rejeita o documento → idem, status "falhou"

## Banco de Dados

Nenhuma migração necessária. O bucket `chat-attachments` foi criado na issue 17. A coluna `content` da tabela `messages` armazena a URL pública; `type` já suporta `"documento"`.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `enviarDocumento(conversaId, formData)` seguindo o mesmo padrão de `enviarImagem`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — converter botão Paperclip em dropdown (reutilizando `DropdownMenu` já importado), adicionar `ref` e `handleAnexarDocumento` para documentos
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — atualizar case `"documento"`: quando `conteudo` começa com `http`/`blob:`, exibir nome do arquivo (extraído da URL) com link de download e ícone `Download`

> O bucket `chat-attachments` (migration 20260503000003) já existe — sem nova migration.

## Dependências Externas

Nenhuma nova — mesmo bucket Supabase Storage da issue 17.

## Checklist

- [x] Adicionar `enviarDocumento(conversaId: string, formData: FormData): Promise<void>` em `actions.ts`: valida MIME type (PDF/Word/Excel/PPT/TXT/ODT), valida tamanho (≤ 100 MB), faz upload ao bucket `chat-attachments` com nome original no path (`${workspace_id}/${conversaId}/${Date.now()}-${nomeArquivoSanitizado}`), chama Meta API com `type: "document"` e `document.filename`, insere mensagem com `type: "documento"` e `content: publicUrl`
- [x] Em `painel-conversa.tsx`: adicionar `docInputRef` e estado `enviandoDocumento`, adicionar `handleAnexarDocumento` (valida tamanho ≤ 100 MB, balão otimista, chama `enviarDocumento`, trata erro)
- [x] Em `painel-conversa.tsx`: converter botão Paperclip em `DropdownMenu` (já importado) com dois itens — "Imagem" (aciona `fileInputRef`) e "Documento" (aciona `docInputRef`); adicionar `<input type="file">` oculto para documentos com `accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.odt,.ods,.odp"`
- [x] Em `balao-mensagem.tsx`: importar `Download` do lucide-react; no case `"documento"`, se `conteudo` começa com `http` ou `blob:`, renderizar `<a>` com `download`, nome extraído da URL (último segmento sem prefixo timestamp) e ícone `Download`
