# 31: Marcar Conversa como Resolvida

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a ação de resolver conversa: ao clicar em "Resolver" no menu de ações, o status da conversa muda para "Resolvida" e ela sai das listas de Em espera e Em atendimento.

## Cenários

### Happy Path
1. Usuário abre uma conversa com status "Em atendimento"
2. Clica no ícone `...` no cabeçalho → vê a ação "Resolver"
3. Clica em "Resolver"
4. `resolverConversa` é chamada no servidor
5. O badge de status no cabeçalho muda para "Resolvida"
6. A conversa continua visível se o filtro incluir "Resolvidas", mas sai dos filtros "Em espera" e "Em atendimento"

### Edge Cases
- Qualquer usuário com acesso à conversa pode resolver (sem restrição de papel)
- Conversa já resolvida não exibe "Resolver" (ACOES_POR_STATUS já trata isso — "resolvida" exibe apenas "Reabrir")

### Cenário de Erro
- Falha no servidor: status permanece "Em atendimento"; `alert` exibe a mensagem de erro

## Banco de Dados

- Tabela: `conversations`
  - `status` (text) — alterado para `"resolvida"`

## Arquivos

- **Modificar:** `src/app/(auth)/chat/actions.ts` — adicionar `resolverConversa`
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar handler para "Resolver" no dropdown, chamando `resolverConversa` e `onConversaAtualizada`

## Checklist

- [x] Adicionar `resolverConversa(conversaId): Promise<void>` em `actions.ts` — atualiza `status = "resolvida"` na conversa
- [x] Em `painel-conversa.tsx`, importar `resolverConversa` e adicionar handler no `DropdownMenuItem` de "Resolver": ao clicar, chamar a action e depois `onConversaAtualizada(conversa.id, { status: "resolvida" })`
