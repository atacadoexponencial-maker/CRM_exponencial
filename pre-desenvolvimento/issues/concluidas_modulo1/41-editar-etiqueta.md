# 41: Editar Etiqueta Existente

**Tipo:** Implementação
**Página:** Etiquetas

## Descrição

Implementar a edição de etiqueta: Admin altera o nome ou a cor de uma etiqueta existente, o sistema salva no Supabase e as mudanças se refletem em todas as conversas que possuem a etiqueta.

## Cenários

### Happy Path
1. Admin abre o menu de ações de uma etiqueta e seleciona "Editar"
2. Dialog abre com nome e cor pré-preenchidos com os valores atuais
3. Admin altera nome e/ou cor
4. Admin clica em "Salvar" (habilitado apenas com nome + cor preenchidos)
5. `editarEtiqueta()` é chamada — botão fica desabilitado durante a requisição
6. Supabase atualiza `name` e `color` na tabela `labels` onde `id = etiqueta.id`
7. Dialog fecha, linha da tabela exibe os novos valores

### Edge Cases
- Nome com espaços em branco apenas: `trim()` → botão desabilitado no frontend
- Salvar sem alterar nada (mesmos valores): operação ocorre normalmente (UPDATE idempotente)
- Dialog fechado antes de salvar: estado do formulário é resetado ao reabrir

### Cenário de Erro
- Falha no Supabase: exibe mensagem de erro dentro do dialog ("Não foi possível editar a etiqueta. Tente novamente.")
- Usuário não-admin chamando a action: retorna `{ erro: "Sem permissão" }`
- ID não encontrado no workspace: retorna `{ erro: "Não foi possível editar a etiqueta. Tente novamente." }`

## Banco de Dados

- Tabela: `labels` (criada na issue 39)
  - `name` (text) — atualizado com o novo nome
  - `color` (text) — atualizado com a nova cor

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/actions.ts` — adicionar `editarEtiqueta(id, nome, cor)` que faz UPDATE na tabela `labels` e retorna `{ erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — conectar `handleEditar` à server action `editarEtiqueta`, adicionando estado de loading e exibição de erro

## Checklist

- [x] Adicionar `editarEtiqueta(id, nome, cor)` em `actions.ts` com verificação de admin e UPDATE no Supabase (filtrado por id + workspace_id)
- [x] Modificar `handleEditar` em `etiquetas-client.tsx` para chamar `editarEtiqueta` (async, com `isPendingEditar`)
- [x] Adicionar estado `erroEditar` no dialog de editar para exibir erros retornados pela action
- [x] Desabilitar o botão "Salvar" durante a requisição (`isPendingEditar`)
- [x] Em caso de sucesso, atualizar a etiqueta no estado local e fechar o dialog
