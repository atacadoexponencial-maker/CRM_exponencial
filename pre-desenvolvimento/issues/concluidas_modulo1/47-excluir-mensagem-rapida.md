# 47: Excluir Mensagem Rápida

**Tipo:** Implementação
**Página:** Mensagens Rápidas

## Descrição

Implementar a exclusão de mensagem rápida: Admin clica em excluir, o sistema remove do Supabase e a mensagem deixa de aparecer no seletor do chat para todos os usuários.

## Cenários

### Happy Path
1. Admin clica em "Excluir" no dropdown de uma mensagem
2. Dialog de confirmação abre mostrando o título da mensagem
3. Admin confirma clicando em "Excluir"
4. `excluirMensagemRapida()` é chamada → DELETE em `quick_replies`
5. Mensagem removida imediatamente da tabela

### Edge Cases
- Clique duplo: botão desabilitado durante `isPendingExcluir`

### Cenário de Erro
- Falha no Supabase: `excluirMensagemRapida()` retorna `{ erro }` — mensagem de erro exibida dentro do dialog; lista não é alterada

## Banco de Dados

- Tabela: `quick_replies`
  - DELETE filtrado por `id + workspace_id`

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts` — adicionar `excluirMensagemRapida(id)` retornando `{ erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — importar `excluirMensagemRapida`; adicionar `isPendingExcluir` e `erroExcluir`; tornar `handleExcluir` assíncrono; exibir erro no dialog; resetar erro no `onOpenChange`

## Checklist

- [x] Adicionar `excluirMensagemRapida(id)` em `actions.ts` com DELETE em `quick_replies`
- [x] Atualizar `mensagens-rapidas-client.tsx`: `handleExcluir` async com `isPendingExcluir`, `erroExcluir`, erro inline no dialog e reset no `onOpenChange`
