# 13: Atualizar Lista de Conversas em Tempo Real

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar a atualização em tempo real da lista de conversas via Supabase Realtime: quando uma nova mensagem é recebida, a conversa correspondente sobe para o topo da lista e o badge é atualizado sem recarregar a página.

## Cenários

### Happy Path
1. Usuário está com a caixa de entrada aberta
2. Um cliente envia uma mensagem via WhatsApp (processada pelo webhook)
3. O webhook atualiza `conversations.last_message_text`, `last_message_at` e `unread_count`
4. O Supabase Realtime emite um evento UPDATE para o cliente
5. A conversa correspondente move para o topo da lista
6. O badge de não lidas exibe o novo valor de `unread_count`
7. O preview da última mensagem é atualizado

### Edge Cases
- Conversa atualmente aberta (ativa): badge fica em 0 (já tratado pelo estado `abertas`)
- Conversa não está na lista do usuário (atendente que não é o responsável): update ignorado — o `idx === -1` retorna estado inalterado
- Múltiplas atualizações rápidas na mesma conversa: cada evento atualiza o estado via `setConversasState` funcional, sem condições de corrida

### Cenário de Erro
- Falha na conexão Realtime: a lista não atualiza em tempo real, mas permanece com os dados do carregamento inicial — sem mensagem de erro ao usuário (degradação silenciosa aceitável)

## Banco de Dados

- Tabela: `conversations` — adicionar à publicação `supabase_realtime` para que o Postgres emita eventos de mudança

## Arquivos

- **Criar:** `supabase/migrations/20260503000002_realtime_conversations.sql` — habilitar a tabela `conversations` na publicação `supabase_realtime`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — mover `conversas` para estado local, adicionar `workspaceId` prop, assinar canal Realtime no `useEffect`, atualizar e reordenar lista ao receber evento UPDATE
- **Modificar:** `src/app/(auth)/chat/page.tsx` — passar `workspaceId` como nova prop para `ChatLayout`

## Checklist

- [x] Criar migration com `alter publication supabase_realtime add table conversations`
- [x] Adicionar prop `workspaceId: string` em `ChatLayoutProps` e passar de `page.tsx`
- [x] Mover `conversas` para estado local em `ChatLayout`: `useState<Conversa[]>(conversas)`
- [x] Substituir uso de `conversas` (prop) por `conversasState` (estado) em toda a derivação
- [x] Adicionar `useEffect` que cria canal Realtime filtrado por `workspace_id=eq.${workspaceId}`, escuta evento UPDATE em `conversations`, atualiza e move a conversa para o topo, e limpa o canal ao desmontar
