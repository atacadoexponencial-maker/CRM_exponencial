# 16: Enviar Mensagem de Texto

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o envio de mensagem de texto via API do WhatsApp (Meta): o usuário digita no campo, clica em enviar (ou pressiona Enter) e a mensagem aparece no histórico com status "enviado".

## Cenários

### Happy Path
1. Usuário digita texto no campo e clica em Enviar (ou pressiona Enter)
2. A mensagem aparece imediatamente no histórico com status "enviado" (otimista)
3. O botão de envio fica desabilitado enquanto o request está em andamento
4. No backend: a mensagem é persistida na tabela `messages` e enviada via Meta API
5. A conversa tem `last_message_text` e `last_message_at` atualizados no banco

### Edge Cases
- Campo vazio: botão desabilitado, nenhuma ação (já implementado)
- Shift+Enter: quebra linha no textarea, não envia (já implementado)
- Notas internas (`modoNota`): permanecem com comportamento local por ora — não chamam a Meta API (fora do escopo desta issue)

### Cenário de Erro
- Falha na Meta API ou no Supabase: a mensagem otimista no histórico muda para status "falhou" (ícone de alerta ⚠ já renderizado por `BalaoMensagem`)
- O campo de texto não é limpo em caso de erro (para o usuário poder reenviar)

## Banco de Dados

- Tabela: `messages` — nova política INSERT para membros do workspace
- Tabela: `conversations` — nova política UPDATE para membros do workspace (para atualizar `last_message_text` e `last_message_at`)

## Arquivos

- **Criar:** `supabase/migrations/20260503000001_messages_send_policies.sql` — INSERT policy em `messages` + UPDATE policy em `conversations` para membros do workspace
- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar Server Action `enviarMensagem(conversaId, texto)`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — conectar `enviar()` à server action, rastrear mensagens com falha localmente

## Checklist

- [x] Criar migration com INSERT policy em `messages` e UPDATE policy em `conversations`
- [x] Adicionar `enviarMensagem(conversaId, texto)` em `actions.ts`: buscar conversa + contato, buscar whatsapp_connection do workspace, chamar Meta API, inserir em `messages`, atualizar `conversations`
- [x] Em `painel-conversa.tsx`: para mensagens de texto (`!modoNota`), chamar `enviarMensagem` após adicionar mensagem otimista via `onMensagemEnviada`
- [x] Em caso de erro: marcar o id temporário como falho em estado local `mensagensFalhadas` e não limpar o campo de texto
- [x] Na renderização: sobrescrever `status` das mensagens com id em `mensagensFalhadas` para `"falhou"`
