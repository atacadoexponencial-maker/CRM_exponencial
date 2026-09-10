# 11: Criar Admin e times padrão ao cadastrar empresa

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Ao criar o workspace, o sistema deve automaticamente criar o primeiro usuário com papel Admin e os dois times padrão: Expansão e Retenção.

## Cenários

### Happy Path
1. Issue 10 já criou o workspace e retornou `workspaceId`
2. Sistema cria o usuário no Supabase Auth via admin API com `email_confirm: true`
3. Sistema insere registro em `profiles` com `role: 'admin'` e o `workspace_id`
4. Sistema insere dois registros em `teams`: Expansão e Retenção, ambos com `is_default: true`
5. Sistema faz login do usuário via SSR client (estabelece sessão em cookie)
6. Frontend redireciona para `/configuracoes/usuarios`

### Edge Cases
- Falha parcial (usuário criado mas perfil não) → a Server Action lança exceção; o workspace já existe mas sem usuário — situação de lixo no banco (aceitável para MVP, cleanup manual se necessário)
- Usuário já existente com mesmo e-mail → a issue 08 já bloqueou no início do fluxo; não chega até aqui

### Cenário de Erro
1. Qualquer operação dentro de `criarAdminETimesPadrao` falha
2. A Server Action lança exceção
3. O `onSubmit` captura e exibe mensagem genérica: **"Não foi possível concluir o cadastro. Tente novamente."** no campo `nomeEmpresa`
4. O formulário permanece preenchido

## Banco de Dados

- Tabela: `profiles`
  - `id` (uuid, PK, references auth.users(id) on delete cascade) — mesmo ID do usuário do Supabase Auth
  - `workspace_id` (uuid, NOT NULL, references workspaces(id)) — workspace ao qual o usuário pertence
  - `name` (text, NOT NULL) — nome do responsável
  - `role` (text, NOT NULL, check in ('admin','gerente','atendente')) — papel do usuário
  - `status` (text, NOT NULL, default 'active', check in ('active','inactive')) — se o usuário está ativo
  - `created_at` (timestamptz, NOT NULL, default now())
  - RLS habilitado — SELECT/UPDATE apenas dentro do mesmo workspace

- Tabela: `teams`
  - `id` (uuid, PK, default gen_random_uuid())
  - `workspace_id` (uuid, NOT NULL, references workspaces(id)) — workspace ao qual o time pertence
  - `name` (text, NOT NULL) — nome do time
  - `is_default` (boolean, NOT NULL, default false) — true para Expansão e Retenção
  - `created_at` (timestamptz, NOT NULL, default now())
  - RLS habilitado — SELECT/INSERT/UPDATE/DELETE apenas dentro do mesmo workspace

- Tabela: `workspaces` (já existe — adicionar política RLS)
  - Policy SELECT: `id = (select workspace_id from profiles where id = auth.uid())`

## Arquivos

- **Criar:** `supabase/migrations/20260425000001_create_profiles.sql` — tabela `profiles` com RLS e política de isolamento por workspace
- **Criar:** `supabase/migrations/20260425000002_create_teams.sql` — tabela `teams` com RLS e política de isolamento por workspace
- **Criar:** `supabase/migrations/20260425000003_add_workspaces_rls_policy.sql` — política SELECT na tabela `workspaces` usando `profiles`
- **Modificar:** `src/app/cadastro/actions.ts` — adicionar `criarAdminETimesPadrao(workspaceId, nomeResponsavel, email, senha)` que cria usuário Auth, perfil, times e faz login via SSR client
- **Modificar:** `src/app/cadastro/page.tsx` — substituir `void workspaceId` por chamada a `criarAdminETimesPadrao` com tratamento de erro e redirect via `useRouter().push('/configuracoes/usuarios')`
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — adicionar mock do SSR client e testes de `criarAdminETimesPadrao` (papel admin, times padrão, is_default, isolamento por workspace)

## Checklist

- [x] Criar `supabase/migrations/20260425000001_create_profiles.sql` com tabela `profiles`, RLS habilitado e policy `workspace_id = (select workspace_id from profiles where id = auth.uid())`
- [x] Criar `supabase/migrations/20260425000002_create_teams.sql` com tabela `teams`, RLS habilitado e mesma policy de workspace
- [x] Criar `supabase/migrations/20260425000003_add_workspaces_rls_policy.sql` com policy SELECT em `workspaces`
- [x] Adicionar `criarAdminETimesPadrao` em `src/app/cadastro/actions.ts`: criar usuário Auth (service role), inserir em `profiles`, inserir 2 times, fazer `signInWithPassword` via SSR client
- [x] Atualizar `onSubmit` em `src/app/cadastro/page.tsx`: importar `useRouter`, chamar `criarAdminETimesPadrao`, tratar erro com `setError`, redirecionar para `/configuracoes/usuarios` após sucesso
