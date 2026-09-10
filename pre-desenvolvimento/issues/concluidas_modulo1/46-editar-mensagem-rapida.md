# 46: Editar Mensagem Rápida

**Tipo:** Implementação
**Página:** Mensagens Rápidas

## Descrição

Implementar a edição de mensagem rápida: Admin altera o título ou o conteúdo de uma mensagem existente e o sistema salva no Supabase, refletindo a mudança imediatamente no seletor do chat.

## Cenários

### Happy Path
1. Admin clica em "Editar" no dropdown de uma mensagem
2. Dialog abre pré-preenchido com título e conteúdo atuais
3. Admin altera os campos e clica em "Salvar"
4. `editarMensagemRapida()` é chamada → UPDATE em `quick_replies`
5. Mensagem atualizada refletida imediatamente na tabela

### Edge Cases
- Campos vazios: botão "Salvar" permanece desabilitado enquanto qualquer campo estiver vazio
- Clique duplo: botão desabilitado durante `isPendingEditar`

### Cenário de Erro
- Falha no Supabase: `editarMensagemRapida()` retorna `{ erro }` — mensagem de erro exibida dentro do dialog; lista não é alterada

## Banco de Dados

- Tabela: `quick_replies`
  - UPDATE: `{ title, content }` filtrado por `id + workspace_id`

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts` — adicionar `editarMensagemRapida(id, titulo, conteudo)` retornando `{ erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — importar `editarMensagemRapida`; adicionar `isPendingEditar` e `erroEditar`; tornar `handleEditar` assíncrono; exibir erro no dialog; resetar erro no `onOpenChange`

## Checklist

- [x] Adicionar `editarMensagemRapida(id, titulo, conteudo)` em `actions.ts` com UPDATE em `quick_replies`
- [x] Atualizar `mensagens-rapidas-client.tsx`: `handleEditar` async com `isPendingEditar`, `erroEditar`, erro inline no dialog e reset no `onOpenChange`
