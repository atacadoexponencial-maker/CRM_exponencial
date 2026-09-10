# 14: Adicionar novo usuário

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin preenche nome, e-mail, senha temporária, papel (Gerente ou Atendente) e times do novo usuário. O sistema cria o usuário e o exibe na lista.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/usuarios` — a página carrega a lista real de usuários do workspace (via SSR).
2. Admin clica em "Adicionar usuário" — um Dialog abre com o formulário.
3. Admin preenche nome, e-mail, senha temporária, seleciona papel (Gerente ou Atendente) e marca os times desejados.
4. Admin clica em "Salvar" — o formulário valida, a Server Action cria o usuário no Supabase Auth, insere em `profiles` e em `user_teams`.
5. O dialog fecha e a página recarrega mostrando o novo usuário na lista.

### Edge Cases
- Admin não seleciona nenhum time: o usuário é criado sem times (permitido).
- E-mail já existe em outro workspace: a criação do usuário no Auth falha — exibir mensagem "E-mail já está em uso".
- Papel "Admin" não deve aparecer no select do formulário (Admin só é criado via cadastro da empresa).

### Cenário de Erro
- Falha ao criar usuário no Auth (e-mail duplicado ou erro de rede): exibir "Não foi possível criar o usuário. Tente novamente." no topo do formulário.
- Falha ao inserir perfil após criar Auth user: situação inconsistente — deve propagar erro genérico.

## Banco de Dados

- Tabela: `user_teams`
  - `user_id` (uuid, FK → profiles.id, ON DELETE CASCADE) — usuário
  - `team_id` (uuid, FK → teams.id, ON DELETE CASCADE) — time
  - Chave primária composta: `(user_id, team_id)`
  - RLS: usuários do workspace veem; admins do workspace gerenciam.

## Arquivos

- **Criar:** `supabase/migrations/20260425000005_create_user_teams.sql` — tabela user_teams com RLS
- **Criar:** `src/components/ui/dialog.tsx` — componente Dialog usando `@base-ui/react/dialog`, mesmo padrão do `dropdown-menu.tsx`
- **Criar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — Server Actions: `adicionarUsuario`
- **Criar:** `src/app/(auth)/configuracoes/usuarios/adicionar-usuario-dialog.tsx` — "use client" com dialog + form (React Hook Form + Zod)
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — converter para Server Component que busca dados reais (profiles + teams via `createSsrClient()`), passa para `AdicionarUsuarioDialog` e exibe tabela real

> A página continuará sendo Server Component; o dialog é um Client Component separado importado dentro dela.

## Dependências Externas

Nenhuma nova — `@base-ui/react`, `react-hook-form`, `zod` e `@supabase/supabase-js` já estão instalados.

## Checklist

- [x] Criar migration `20260425000005_create_user_teams.sql` com tabela e políticas RLS
- [x] Criar `src/components/ui/dialog.tsx` com `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogBackdrop`, `DialogPopup`, `DialogTitle`, `DialogDescription`, `DialogClose`
- [x] Criar `src/app/(auth)/configuracoes/usuarios/actions.ts` com `adicionarUsuario(formData)`
- [x] Criar `src/app/(auth)/configuracoes/usuarios/adicionar-usuario-dialog.tsx` com formulário completo
- [x] Modificar `src/app/(auth)/configuracoes/usuarios/page.tsx`: buscar profiles + teams reais, exibir tabela real, integrar `AdicionarUsuarioDialog`
