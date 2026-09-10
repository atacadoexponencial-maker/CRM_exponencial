# 12: Redirecionar Admin após cadastro

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Após criação bem-sucedida do workspace, o sistema deve autenticar o Admin automaticamente e redirecioná-lo para a tela de configuração inicial.

## Cenários

### Happy Path
1. Usuário preenche o formulário de cadastro e submete
2. E-mail é verificado, workspace é criado, Admin e times padrão são criados
3. `criarAdminETimesPadrao` chama `signInWithPassword` — sessão é estabelecida via cookie SSR
4. O cache do router Next.js é invalidado com `router.refresh()`
5. O usuário é redirecionado para `/configuracoes/usuarios`
6. O middleware valida o cookie de sessão e permite acesso à rota protegida

### Edge Cases
- Se o sign-in falhar após criação do perfil, o `catch` em `page.tsx` exibe mensagem de erro genérica e o usuário permanece no formulário
- Sem `router.refresh()`, o Next.js router cache pode servir conteúdo cacheado sem a sessão nova

### Cenário de Erro
- Se qualquer Server Action lançar exceção, o fluxo para no `try/catch` correspondente em `page.tsx` com mensagem de erro específica; o redirecionamento não acontece

## Banco de Dados (se aplicável)

Não aplicável — nenhuma query ou mutation nova.

## Arquivos

- **Modificar:** `src/app/cadastro/page.tsx` — adicionar `router.refresh()` antes de `router.push("/configuracoes/usuarios")` para garantir que o Next.js invalide o cache do router após o sign-in SSR

> A autenticação (`signInWithPassword`) já está implementada em `src/app/cadastro/actions.ts` (`criarAdminETimesPadrao`). O redirect também já existe na linha 61 de `page.tsx`. A única mudança necessária é adicionar `router.refresh()` antes do `router.push` — prática recomendada pelo Supabase SSR + Next.js App Router para garantir que o cache do router seja invalidado após autenticação server-side.

## Checklist

- [x] Adicionar `router.refresh()` antes de `router.push("/configuracoes/usuarios")` em `src/app/cadastro/page.tsx`
