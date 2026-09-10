# 42: Excluir Etiqueta com Confirmação

**Tipo:** Implementação
**Página:** Etiquetas

## Descrição

Implementar a exclusão de etiqueta: ao clicar em excluir, o sistema exibe um diálogo de confirmação; ao confirmar, a etiqueta é removida do Supabase e as conversas que a tinham perdem a associação.

## Cenários

### Happy Path
1. Admin abre o menu de ações de uma etiqueta e seleciona "Excluir"
2. Dialog de confirmação abre exibindo o nome da etiqueta
3. Admin clica em "Excluir" (botão vermelho)
4. `excluirEtiqueta()` é chamada — botão fica desabilitado durante a requisição
5. Supabase deleta o registro da tabela `labels` (CASCADE remove `conversation_labels` automaticamente)
6. Dialog fecha, linha é removida da tabela na tela

### Edge Cases
- Dialog fechado antes de confirmar: nenhuma ação executada, estado intacto

### Cenário de Erro
- Falha no Supabase: exibe mensagem de erro dentro do dialog ("Não foi possível excluir a etiqueta. Tente novamente.")
- Usuário não-admin chamando a action: retorna `{ erro: "Sem permissão" }`

## Banco de Dados

- Tabela: `labels` (criada na issue 39)
  - DELETE por `id` + `workspace_id`
- Tabela: `conversation_labels` — registros removidos automaticamente via CASCADE (definido na migration da issue 39)

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/actions.ts` — adicionar `excluirEtiqueta(id)` que faz DELETE na tabela `labels` e retorna `{ erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — conectar `handleExcluir` à server action `excluirEtiqueta`, adicionando estado de loading e exibição de erro

## Checklist

- [x] Adicionar `excluirEtiqueta(id)` em `actions.ts` com verificação de admin e DELETE no Supabase (filtrado por id + workspace_id)
- [x] Modificar `handleExcluir` em `etiquetas-client.tsx` para chamar `excluirEtiqueta` (async, com `isPendingExcluir`)
- [x] Adicionar estado `erroExcluir` no dialog de excluir para exibir erros retornados pela action
- [x] Desabilitar o botão "Excluir" durante a requisição (`isPendingExcluir`)
- [x] Em caso de sucesso, remover a etiqueta do estado local e fechar o dialog
