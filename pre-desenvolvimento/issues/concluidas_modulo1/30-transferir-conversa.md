# 30: Transferir Conversa entre Atendentes

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a transferência de conversa: Atendente pode transferir para outro atendente do mesmo time; Admin e Gerente podem transferir para qualquer atendente do workspace — via menu de ações no cabeçalho da conversa.

## Cenários

### Happy Path
1. Usuário abre uma conversa com status "Em atendimento"
2. Clica no ícone `...` no cabeçalho → vê a ação "Transferir"
3. Passa o mouse sobre "Transferir" → aparece submenu com lista de atendentes
   - Admin/Gerente: todos os usuários do workspace
   - Atendente: apenas membros dos times aos quais pertence (excluindo a si mesmo)
4. Clica em um atendente
5. `transferirConversa` é chamada no servidor
6. O cabeçalho atualiza o nome do atendente (status permanece "Em atendimento")

### Edge Cases
- Atendente sem times: submenu exibe "Nenhum atendente"
- Admin/Gerente com workspace sem outros usuários: submenu exibe "Nenhum atendente"
- Atendente tenta transferir para alguém fora do seu time: servidor rejeita

### Cenário de Erro
- Falha no servidor: conversa permanece com o atendente atual; `alert` exibe a mensagem de erro

## Banco de Dados

- Tabela: `conversations`
  - `assigned_to` (uuid, FK → profiles) — atualizado com o novo atendente
  - `status` (text) — permanece `"em_atendimento"` após a transferência

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `transferirConversa`
- **Modificar:** `src/app/(auth)/chat/page.tsx` — computar `atendentesTransferir` (filtrado por time para atendentes) e passar para `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — receber e repassar `atendentesTransferir` para `PainelConversa`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — substituir `DropdownMenuItem` de "Transferir" por submenu usando `atendentesTransferir`

## Checklist

- [x] Adicionar `transferirConversa(conversaId, atendenteId): Promise<{nomeAtribuido: string}>` em `actions.ts` — valida permissão (atendente: mesmo time; admin/gerente: livre), atualiza `assigned_to`, mantém `status = "em_atendimento"`
- [x] Em `page.tsx`, computar `atendentesTransferir`: se Admin/Gerente → mesmo array `atendentes`; se Atendente → buscar membros dos times do usuário (via `user_teams` join) excluindo a si mesmo
- [x] Em `chat-layout.tsx`, receber `atendentesTransferir: Array<{id: string, nome: string}>` e passar para `PainelConversa`
- [x] Em `painel-conversa.tsx`, receber `atendentesTransferir` e substituir `DropdownMenuItem` de "Transferir" por `DropdownMenuSub` com a lista; ao clicar, chamar `transferirConversa` e depois `onConversaAtualizada`
