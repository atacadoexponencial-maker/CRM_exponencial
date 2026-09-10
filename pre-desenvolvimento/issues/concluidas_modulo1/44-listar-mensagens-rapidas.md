# 44: Listar Mensagens Rápidas do Workspace

**Tipo:** Implementação
**Página:** Mensagens Rápidas

## Descrição

Implementar o carregamento e exibição de todas as mensagens rápidas do workspace na página de configuração, mostrando título e preview do conteúdo — acessível apenas para Admin.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/mensagens-rapidas`
2. Page Server Component verifica role → admin → OK
3. `listarMensagensRapidas()` busca registros da tabela `quick_replies` do workspace
4. Tabela exibe título (atalho) e preview do conteúdo para cada mensagem
5. Se não houver mensagens, exibe estado vazio com ícone Zap

### Edge Cases
- Workspace sem mensagens rápidas: exibe estado vazio ("Nenhuma mensagem rápida cadastrada")

### Cenário de Erro
- Usuário não-admin: redirecionado para `/perfil`
- Usuário não autenticado: redirecionado para `/login`
- Falha no Supabase: `listarMensagensRapidas()` retorna array vazio

## Banco de Dados

- Tabela: `quick_replies`
  - `id` (uuid, PK) — identificador
  - `workspace_id` (uuid, FK → workspaces) — isolamento multi-tenant
  - `title` (text, not null) — atalho/título da mensagem
  - `content` (text, not null) — texto completo da mensagem
  - `created_at` (timestamptz) — data de criação

## Arquivos

- **Criar:** `supabase/migrations/20260519000004_create_quick_replies.sql` — tabela `quick_replies` com RLS (todos os membros veem, apenas admin gerencia)
- **Criar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts` — server action `listarMensagensRapidas()` retornando `{ id, titulo, conteudo }[]`
- **Criar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — componente client extraído de `page.tsx` com os dialogs de criar/editar/excluir (mock local, issues futuras)
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/page.tsx` — converter de "use client" + mock para Server Component que verifica admin e chama `listarMensagensRapidas()`

## Checklist

- [x] Criar migration `20260519000004_create_quick_replies.sql` com tabela `quick_replies` e RLS
- [x] Criar `actions.ts` com `listarMensagensRapidas()` retornando dados reais do Supabase
- [x] Criar `mensagens-rapidas-client.tsx` com todo o código client (dialogs, estado, tabela) recebendo `mensagensIniciais` como prop
- [x] Converter `page.tsx` para Server Component: verificar admin, chamar `listarMensagensRapidas()`, passar dados para `MensagensRapidasClient`
