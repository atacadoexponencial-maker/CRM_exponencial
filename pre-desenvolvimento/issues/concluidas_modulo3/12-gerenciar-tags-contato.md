# 12: Gerenciar Tags do Contato

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Usuário adiciona tag livre (texto curto, sem espaços) ao contato e remove tags existentes; as tags são salvas e exibidas no perfil.

## Cenários

### Happy Path
1. Usuário abre perfil de um contato
2. Na seção "Tags", digita `vip` no campo de texto
3. Clica em "Adicionar" (ou pressiona Enter)
4. Tag `vip` aparece imediatamente como badge na lista
5. Usuário clica em × na tag `vip`
6. Tag é removida da lista

### Edge Cases
- Tag com espaços (ex: `meu cliente`) → rejeitada com mensagem de erro
- Tag duplicada para o mesmo contato → rejeitada silenciosamente (sem duplicar na UI)
- Tag vazia (campo em branco) → botão Adicionar desabilitado ou ignorado
- Tag muito longa (>50 chars) → rejeitada
- Contato sem tags exibe estado vazio "Nenhuma tag"

### Cenário de Erro
- Falha ao salvar tag no banco → exibe mensagem de erro inline, mantém input preenchido
- Falha ao remover tag → exibe mensagem de erro inline

## Banco de Dados

- Tabela: `contact_tags`
  - `id` (uuid) — pk
  - `contact_id` (uuid) — FK contacts(id) on delete cascade
  - `workspace_id` (uuid) — FK workspaces(id), para RLS eficiente
  - `tag` (text) — valor da tag, sem espaços, unique por (contact_id, tag)
  - `created_at` (timestamptz)
  - Constraint: `check (tag ~ '^[^\s]+$')` — sem espaços
  - Unique: `(contact_id, tag)`

## Arquivos

- **Criar:** `supabase/migrations/20260603000003_create_contact_tags.sql` — cria tabela `contact_tags` com RLS
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adicionar `adicionarTagContato`, `removerTagContato`; atualizar `buscarDadosContato` para buscar tags
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — adicionar UI interativa na seção Tags: input + botão "Adicionar", botão × em cada tag

## Checklist

- [x] Criar migração `contact_tags` com constraints e políticas RLS (select/insert/delete por workspace)
- [x] Atualizar `buscarDadosContato` para buscar `contact_tags` em paralelo e popular `tags`
- [x] Implementar `adicionarTagContato(contactId, tag)` — valida, insere, retorna `{erro?}`
- [x] Implementar `removerTagContato(contactId, tag)` — deleta, retorna `{erro?}`
- [x] Atualizar seção Tags em `perfil-contato.tsx`: input de texto + botão "Adicionar" (Enter também confirma), badge com botão ×, estado de erro inline
- [x] Validar no frontend: sem espaços, max 50 chars, não vazia antes de chamar a action
