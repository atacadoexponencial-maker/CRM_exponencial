# 43: Aplicar e Remover Etiqueta em Conversa

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a aplicação e remoção de etiquetas em conversas: qualquer usuário pode selecionar etiquetas disponíveis no workspace para classificar uma conversa, com a mudança refletida na lista de conversas.

## Cenários

### Happy Path
1. Usuário abre uma conversa
2. Clica no menu de ações (MoreVertical) no cabeçalho
3. Seleciona o submenu "Etiquetas" — lista todas as labels do workspace
4. Labels já aplicadas aparecem com um checkmark
5. Clica em label não aplicada → `aplicarEtiqueta()` chamada → label aparece no item da conversa na lista lateral
6. Clica em label já aplicada → `removerEtiqueta()` chamada → label some do item da conversa na lista lateral

### Edge Cases
- Workspace sem etiquetas: submenu mostra "Nenhuma etiqueta disponível"
- Conversa sem etiquetas: submenu mostra apenas checkmarks nas que forem aplicadas (nenhuma)
- Clique rápido duplo: segunda chamada ignorada se a primeira ainda estiver pendente (pendingLabelId)

### Cenário de Erro
- Falha no Supabase: `aplicarEtiqueta`/`removerEtiqueta` retornam `{ erro }` — não há atualização visual, e a interface permanece no estado anterior

## Banco de Dados

- Tabela: `conversation_labels` (criada na issue 39)
  - INSERT para aplicar: `{ conversation_id, label_id }`
  - DELETE para remover: `.eq("conversation_id").eq("label_id")`
- Migration necessária: corrigir RLS da `conversation_labels` para permitir que todos os membros (não só admin) possam INSERT/DELETE

## Arquivos

- **Criar:** `supabase/migrations/20260519000003_conversation_labels_member_access.sql` — nova policy que permite a todos os membros do workspace inserir e excluir vínculos de etiqueta
- **Modificar:** `src/app/(auth)/chat/mock-conversas.ts` — adicionar campo `id` ao tipo `Conversa.etiquetas` e atualizar mock data com IDs fictícios
- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `listarEtiquetasWorkspace()`, `aplicarEtiqueta(conversaId, labelId)` e `removerEtiqueta(conversaId, labelId)`
- **Modificar:** `src/app/(auth)/chat/page.tsx` — buscar etiquetas por conversa (`conversation_labels`) e lista de labels disponíveis no workspace; passar ao `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — aceitar prop `etiquetasDisponiveis`, repassar para `FiltrosCaixa` e `PainelConversa`
- **Modificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — substituir `ETIQUETAS_DISPONIVEIS` hardcoded pela prop `etiquetasDisponiveis`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar `DropdownMenuSub` "Etiquetas" no `MoreVertical` com toggle por label; aceitar props `etiquetasDisponiveis` e `onConversaAtualizada` já existente

## Checklist

- [x] Criar migration `20260519000003_conversation_labels_member_access.sql` com policy de INSERT/DELETE para todos os membros do workspace
- [x] Atualizar `Conversa.etiquetas` em `mock-conversas.ts` para incluir `id: string`; adicionar IDs nos mocks
- [x] Adicionar `listarEtiquetasWorkspace()` em `actions.ts` (sem restrição de role, usa workspace_id do perfil)
- [x] Adicionar `aplicarEtiqueta(conversaId, labelId)` em `actions.ts` com INSERT em `conversation_labels`
- [x] Adicionar `removerEtiqueta(conversaId, labelId)` em `actions.ts` com DELETE em `conversation_labels`
- [x] Atualizar `page.tsx` para buscar `conversation_labels(label_id, labels(id, name, color))` junto com as conversas e workspace labels; popular `etiquetas` de cada `Conversa`
- [x] Atualizar `ChatLayout` para aceitar e repassar `etiquetasDisponiveis`
- [x] Atualizar `FiltrosCaixa` para receber `etiquetasDisponiveis` como prop (remover `ETIQUETAS_DISPONIVEIS` hardcoded)
- [x] Adicionar submenu "Etiquetas" em `PainelConversa` com checkmarks e toggle via server actions
