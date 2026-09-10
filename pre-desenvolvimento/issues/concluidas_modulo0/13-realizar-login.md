# 13: Realizar login

**Tipo:** Implementação
**Página:** Login

## Descrição

Implementar o formulário de login com e-mail e senha. Ao submeter, o sistema valida as credenciais e redireciona para a caixa de entrada em caso de sucesso, ou exibe erro genérico sem indicar qual campo está incorreto em caso de falha.

## Cenários

### Happy Path
1. Usuário acessa `/login`, preenche e-mail e senha válidos e submete
2. `realizarLogin` chama `signInWithPassword` via SSR client — sessão estabelecida via cookie
3. `router.refresh()` invalida o cache do router Next.js
4. Usuário é redirecionado para `/configuracoes/usuarios` (rota autenticada inicial)
5. Middleware valida o cookie de sessão e permite acesso

### Edge Cases
- Campos vazios: validação Zod bloqueia submit antes de chamar a action
- E-mail com formato inválido: validação Zod bloqueia submit com mensagem no campo
- Usuário já autenticado que acessa `/login`: middleware não redireciona (rota pública), mas após submit bem-sucedido vai para `/configuracoes/usuarios`

### Cenário de Erro
- Credenciais inválidas (e-mail não existe ou senha errada): exibe mensagem genérica **"E-mail ou senha incorretos"** como erro de root do formulário — sem indicar qual campo está errado
- Falha de conexão/servidor: exibe mensagem genérica "Não foi possível realizar o login. Tente novamente."

## Banco de Dados (se aplicável)

Não aplicável — nenhuma query ou mutation nova. Usa `auth.signInWithPassword` do Supabase.

## Arquivos

- **Criar:** `src/app/login/actions.ts` — Server Action `realizarLogin(email, senha)` que chama `signInWithPassword` via SSR client
- **Modificar:** `src/app/login/page.tsx` — adicionar `"use client"`, React Hook Form + Zod, integrar com `realizarLogin`, exibir erro genérico de root, redirecionar com `router.refresh()` + `router.push`

> Reutilizar de `src/app/cadastro/`:
> - Padrão `createSsrClient` de `@/integrations/supabase/server` (para a action)
> - Padrão `"use client"` + `useRouter` + `useForm` + `zodResolver` + `z` (para a page)
> - Componentes `Button`, `Input`, `Label` de `@/components/ui/`
> - Padrão de `router.refresh()` + `router.push()` após sign-in

## Checklist

- [x] Criar `src/app/login/actions.ts` com `realizarLogin(email, senha)` usando `createSsrClient`
- [x] Adicionar `"use client"` e imports em `src/app/login/page.tsx`
- [x] Definir schema Zod: `email` (obrigatório + formato) e `senha` (obrigatório)
- [x] Conectar formulário ao React Hook Form com `zodResolver`
- [x] Implementar `onSubmit` que chama `realizarLogin` e trata erros com `setError("root", ...)`
- [x] Exibir mensagem de erro genérica de root abaixo do formulário
- [x] Redirecionar com `router.refresh()` + `router.push("/configuracoes/usuarios")` em caso de sucesso
