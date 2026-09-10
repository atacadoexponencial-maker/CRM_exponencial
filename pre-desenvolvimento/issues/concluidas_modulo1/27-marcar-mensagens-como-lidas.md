# 27: Marcar Mensagens como Lidas ao Abrir Conversa

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a marcação automática de leitura ao abrir uma conversa: todas as mensagens não lidas são marcadas como lidas no backend, zerando o badge e removendo o destaque em negrito na lista.

> **Nota de planejamento:** o frontend já zera `naoLidas` localmente via `abertas` Set em `chat-layout.tsx` (linha 83-85). O que falta é a Server Action que persiste no backend (`unread_count = 0` na tabela `conversations`) e a chamada a ela ao abrir a conversa.

## Cenários

### Happy Path
1. Usuário clica em uma conversa com `naoLidas > 0`
2. Frontend zera o badge imediatamente (comportamento já existente via `abertas`)
3. Server Action `marcarComoLidas` é chamada em background com o `conversaId`
4. Backend atualiza `unread_count = 0` na tabela `conversations`
5. Realtime (já existente) confirma o zero via UPDATE event

### Edge Cases
- Conversa com `naoLidas = 0` — a action ainda pode ser chamada; `UPDATE` com mesmo valor é inofensivo
- Erro na action não afeta a UX — o zero local já foi feito; o realtime corrigirá se necessário
- Chamada feita apenas na **primeira abertura** não é necessária — pode ser chamada a cada clique sem problema

### Cenário de Erro
- Se a action falhar, o badge permanece zerado na UI (o `abertas` Set já foi atualizado) — sem rollback necessário para este protótipo

## Banco de Dados

- Tabela: `conversations`
  - `unread_count` (integer) — zerado para 0 ao abrir a conversa

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar Server Action `marcarComoLidas(conversaId: string)`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — chamar `marcarComoLidas` dentro de `handleConversaClick`

## Checklist

- [x] Server Action `marcarComoLidas(conversaId: string)` criada em `actions.ts`
- [x] Action faz `UPDATE conversations SET unread_count = 0 WHERE id = conversaId` via Supabase
- [x] Action verifica autenticação antes de executar
- [x] `marcarComoLidas` importada e chamada em `handleConversaClick` no `chat-layout.tsx`
- [x] Chamada é fire-and-forget (sem `await` bloqueante, sem tratar erro na UI)
