# 28: Exibir Status de Entrega e Leitura das Mensagens

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar os ícones de status em cada mensagem enviada: enviado (✓), entregue (✓✓), lido (✓✓ azul) e falhou (⚠), atualizando em tempo real conforme os webhooks do WhatsApp chegam.

> **Nota de planejamento:** a renderização dos ícones já existe em `balao-mensagem.tsx` via `IconeStatus`. O que falta: (1) coluna `wamid` na tabela `messages` para correlacionar status updates do webhook; (2) salvar o wamid ao enviar mensagem; (3) webhook processa `statuses`; (4) `messages` na publicação Realtime; (5) subscrição Realtime no frontend.

## Cenários

### Happy Path
1. Usuário envia mensagem — status inicial "enviado" (✓) exibido imediatamente
2. WhatsApp envia webhook `statuses: [{ status: "delivered" }]` — backend atualiza `status = "entregue"` pelo `wamid`
3. Realtime notifica o frontend — ícone muda para ✓✓ cinza em tempo real
4. WhatsApp envia webhook `statuses: [{ status: "read" }]` — status muda para "lido", ícone ✓✓ azul

### Edge Cases
- Webhook de status chega para mensagem não encontrada no banco (wamid inválido) → ignora silenciosamente
- Status `failed` → ícone ⚠ (já tratado em `mensagensFalhadas` local, agora também persiste no banco)
- Mensagens recebidas (direction = "recebida") não exibem ícone de status — `IconeStatus` só renderiza quando `isEnviada`

### Cenário de Erro
- Se Realtime falhar, status permanece o último valor conhecido — sem rollback necessário

## Banco de Dados

- Tabela: `messages`
  - `wamid` (text, nullable, unique) — ID da mensagem retornado pela Meta API ao enviar

## Arquivos

- **Criar:** `supabase/migrations/20260519000000_messages_wamid_realtime.sql` — adiciona coluna `wamid` e inclui `messages` na publicação Realtime
- **Modificar:** `src/app/(auth)/chat/actions.ts` — salvar `wamid` retornado pela Meta API em `enviarMensagem`
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — processar array `statuses` do payload e atualizar `status` pelo `wamid`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — subscrição Realtime na tabela `messages` para atualizar `mensagensLocais` quando status mudar

## Checklist

- [x] Migration cria coluna `wamid text unique` em `messages`
- [x] Migration adiciona `messages` à publicação `supabase_realtime`
- [x] `enviarMensagem` em `actions.ts` salva `wamid` retornado pela Meta API no insert da mensagem
- [x] Webhook processa `statuses` array: para cada status, faz UPDATE em `messages` onde `wamid = status.id`
- [x] Webhook mapeia status Meta → status DB: `"delivered"` → `"entregue"`, `"read"` → `"lido"`, `"failed"` → `"falhou"`
- [x] `chat-layout.tsx` tem subscrição Realtime em `messages` (event: UPDATE) que atualiza o status da mensagem em `mensagensLocais`
