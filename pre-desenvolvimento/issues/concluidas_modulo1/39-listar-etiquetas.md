# 39: Listar Etiquetas do Workspace

**Tipo:** Implementação
**Página:** Etiquetas

## Descrição

Implementar o carregamento e exibição de todas as etiquetas do workspace na página de configuração, mostrando nome, cor e quantidade de conversas com cada etiqueta — acessível apenas para Admin.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/etiquetas`
2. Middleware verifica sessão → OK
3. Page Server Component verifica role → admin → OK
4. `listarEtiquetas()` busca etiquetas do workspace com contagem de conversas
5. Tabela exibe nome, cor (bolinha colorida) e contagem de conversas para cada etiqueta
6. Se não houver etiquetas, exibe estado vazio com ícone Tag

### Edge Cases
- Workspace sem etiquetas: exibe estado vazio ("Nenhuma etiqueta cadastrada")
- Etiqueta com 0 conversas: exibe "0 conversas"
- Etiqueta com 1 conversa: exibe "1 conversa" (singular)

### Cenário de Erro
- Usuário não-admin: redirecionado para `/perfil`
- Usuário não autenticado: redirecionado para `/login`
- Falha no Supabase: `listarEtiquetas()` retorna array vazio

## Banco de Dados

- Tabela: `labels`
  - `id` (uuid, PK) — identificador
  - `workspace_id` (uuid, FK → workspaces) — isolamento multi-tenant
  - `name` (text, not null) — nome da etiqueta
  - `color` (text, not null) — cor hex (#rrggbb)
  - `created_at` (timestamptz) — data de criação

- Tabela: `conversation_labels`
  - `conversation_id` (uuid, FK → conversations) — conversa
  - `label_id` (uuid, FK → labels) — etiqueta
  - PK composta (conversation_id, label_id)

## Arquivos

- **Criar:** `supabase/migrations/20260519000001_create_labels.sql` — tabela `labels` com RLS (membros veem etiquetas do próprio workspace)
- **Criar:** `supabase/migrations/20260519000002_create_conversation_labels.sql` — tabela de junção `conversation_labels` com RLS
- **Criar:** `src/app/(auth)/configuracoes/etiquetas/actions.ts` — server action `listarEtiquetas()` que retorna `{ id, nome, cor, conversas }[]`
- **Criar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — componente client extraído do page.tsx (necessidade técnica: Server Components não suportam useState; mantém os dialogs de criar/editar/excluir com mock local)
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/page.tsx` — converter de "use client" + mock para Server Component que verifica admin e chama `listarEtiquetas()`

## Checklist

- [x] Criar migration `20260519000001_create_labels.sql` com tabela `labels` e RLS
- [x] Criar migration `20260519000002_create_conversation_labels.sql` com tabela `conversation_labels` e RLS
- [x] Criar `actions.ts` com `listarEtiquetas()` retornando dados reais do Supabase (com contagem via LEFT JOIN em `conversation_labels`)
- [x] Converter `page.tsx` para Server Component: verificar admin, chamar `listarEtiquetas()`, passar dados para a tabela
- [x] Manter dialogs de criar/editar/excluir como estão (com mock local) — essas actions serão implementadas em issues futuras
