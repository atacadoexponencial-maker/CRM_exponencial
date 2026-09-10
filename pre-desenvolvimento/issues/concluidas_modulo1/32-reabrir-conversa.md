# 32: Reabrir Conversa Resolvida

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a ação de reabrir conversa: ao clicar em "Reabrir" em uma conversa com status "Resolvida", o status volta para "Em atendimento" (se tiver atendente) ou "Em espera".

## Cenários

### Happy Path
1. Usuário abre uma conversa com status "Resolvida"
2. Clica no ícone `...` no cabeçalho → vê a ação "Reabrir"
3. Clica em "Reabrir"
4. `reabrirConversa` é chamada no servidor
5. Servidor verifica se a conversa tem `assigned_to`:
   - Se sim → status volta para `"em_atendimento"`
   - Se não → status volta para `"em_espera"`
6. O badge de status no cabeçalho atualiza conforme o novo status

### Edge Cases
- Conversa sem atendente atribuído reabre como "Em espera"
- Conversa com atendente atribuído reabre como "Em atendimento"

### Cenário de Erro
- Falha no servidor: status permanece "Resolvida"; `alert` exibe a mensagem de erro

## Banco de Dados

- Tabela: `conversations`
  - `status` (text) — alterado para `"em_atendimento"` ou `"em_espera"` dependendo de `assigned_to`
  - `assigned_to` (uuid) — lido para decidir o novo status (não alterado)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `reabrirConversa`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar handler para "Reabrir" no dropdown, chamando `reabrirConversa` e `onConversaAtualizada`

## Checklist

- [x] Adicionar `reabrirConversa(conversaId): Promise<{ novoStatus: "em_atendimento" | "em_espera" }>` em `actions.ts` — lê `assigned_to` da conversa, define novo status, atualiza `status` no banco
- [x] Em `painel-conversa.tsx`, importar `reabrirConversa` e adicionar handler no `DropdownMenuItem` de "Reabrir": ao clicar, chamar a action e depois `onConversaAtualizada(conversa.id, { status: novoStatus })`
