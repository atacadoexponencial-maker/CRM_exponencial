# 29: Atribuir Conversa a um Atendente

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a atribuição de conversa: Admin ou Gerente seleciona um atendente (ou a si mesmo) no menu de ações do cabeçalho e a conversa é vinculada ao atendente escolhido, mudando o status para "Em atendimento".

## Cenários

### Happy Path
1. Admin/Gerente abre uma conversa com status "Em espera"
2. Clica no ícone `...` (MoreVertical) no cabeçalho
3. Passa o mouse sobre "Atribuir" → aparece submenu com lista de usuários do workspace
4. Seleciona um atendente (ou a si mesmo)
5. `atribuirConversa` é chamada no servidor
6. O cabeçalho da conversa atualiza para "Em atendimento" e exibe o nome do atendente

### Edge Cases
- Atendente não vê a opção "Atribuir" (apenas Admin/Gerente podem atribuir)
- Workspace sem usuários além do atual: submenu exibe apenas o usuário logado
- Conversa já atribuída: não bloqueia, permite reatribuição via "Transferir" (fora do escopo desta issue)

### Cenário de Erro
- Falha no servidor ao salvar: a conversa volta ao estado anterior e um `alert` exibe a mensagem de erro

## Banco de Dados

- Tabela: `conversations`
  - `assigned_to` (uuid, FK → profiles) — UUID do atendente atribuído
  - `status` (text) — alterado para `"em_atendimento"` na atribuição

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `buscarAtendentes` e `atribuirConversa`
- **Modificar:** `src/app/(auth)/chat/page.tsx` — buscar lista de atendentes e passar para `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — receber `atendentes` e `userId`, passar para `PainelConversa`, implementar `onConversaAtualizada`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — receber `atendentes`, `podeAtribuir` e `onConversaAtualizada`; transformar item "Atribuir" em submenu com lista de atendentes

## Checklist

- [x] Adicionar `buscarAtendentes(workspaceId): Promise<Array<{id: string, nome: string}>>` em `actions.ts`
- [x] Adicionar `atribuirConversa(conversaId, atendenteId): Promise<{nomeAtribuido: string}>` em `actions.ts` — valida role (Admin/Gerente), atualiza `assigned_to` e `status = "em_atendimento"`
- [x] Em `page.tsx`, buscar atendentes do workspace e passar para `ChatLayout` como prop `atendentes`
- [x] Em `chat-layout.tsx`, receber `atendentes: Array<{id: string, nome: string}>` e `userId: string`; passar para `PainelConversa`; implementar callback `onConversaAtualizada(id, updates)` que atualiza `conversasState`
- [x] Em `painel-conversa.tsx`, receber `atendentes`, `podeAtribuir: boolean` e `onConversaAtualizada`; substituir `DropdownMenuItem` de "Atribuir" por `DropdownMenuSub` + `DropdownMenuSubTrigger` + `DropdownMenuSubContent` com a lista de atendentes; ao clicar num atendente, chamar `atribuirConversa` e depois `onConversaAtualizada`
