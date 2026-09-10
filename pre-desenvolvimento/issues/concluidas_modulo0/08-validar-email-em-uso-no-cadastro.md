# 08: Validar e-mail já em uso no cadastro

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Ao submeter o formulário, o sistema deve verificar se o e-mail informado já está cadastrado e exibir mensagem de erro específica caso esteja.

## Cenários

### Happy Path
1. Usuário preenche o formulário com um e-mail ainda não cadastrado
2. Clica em "Criar conta"
3. O `onSubmit` chama a server action `verificarEmailEmUso(email)`
4. A server action consulta o Supabase Admin API — e-mail não encontrado → retorna `false`
5. O fluxo continua normalmente (escopo de outra issue)

### Edge Cases
- E-mail válido sintaticamente mas já cadastrado → exibe erro no campo, não avança
- Falha de rede ou erro inesperado na server action → exibe mensagem de erro genérica abaixo do campo

### Cenário de Erro
- E-mail já cadastrado: campo "E-mail" recebe o erro `"E-mail já está em uso"` via `setError`
- Erro interno (ex.: service_role_key ausente ou falha no Supabase): campo "E-mail" recebe `"Não foi possível verificar o e-mail. Tente novamente."`

## Banco de Dados (se aplicável)

Não requer alteração de schema. A verificação é feita via `auth.users` do Supabase, acessada pelo Admin API.

## Arquivos

- **Criar:** `src/app/cadastro/actions.ts` — Server action `verificarEmailEmUso(email)` que usa o Supabase Admin client para checar se o e-mail já existe em `auth.users`
- **Modificar:** `src/app/cadastro/page.tsx` — Adiciona `setError` ao hook de formulário; no `onSubmit`, chama `verificarEmailEmUso` e aplica o erro no campo se e-mail já estiver em uso

> `.env.local` e `.env.example` precisam ter `SUPABASE_SERVICE_ROLE_KEY` configurado (pré-requisito de infra, não é arquivo de código).

## Dependências Externas

- `@supabase/supabase-js` — já instalado; necessário para `createClient` com service role key no servidor

## Checklist

- [x] Criar `src/app/cadastro/actions.ts` com `"use server"` e a função `verificarEmailEmUso(email: string): Promise<boolean>`
- [x] Na server action, usar `createClient(url, serviceRoleKey)` do `@supabase/supabase-js` e chamar `supabase.auth.admin.getUserByEmail(email)`
- [x] Retornar `true` se user encontrado (e-mail em uso), `false` se erro "not found"
- [x] Lançar erro genérico em caso de falha inesperada
- [x] Em `src/app/cadastro/page.tsx`, adicionar `setError` ao destructure do `useForm`
- [x] No `onSubmit`, chamar `verificarEmailEmUso(data.email)` antes de prosseguir
- [x] Se retornar `true`, chamar `setError("email", { type: "manual", message: "E-mail já está em uso" })` e retornar
- [x] Se lançar exceção, chamar `setError("email", { type: "manual", message: "Não foi possível verificar o e-mail. Tente novamente." })` e retornar
