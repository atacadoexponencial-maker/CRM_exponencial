# 30: Realizar logout

**Tipo:** Implementação
**Página:** Perfil do Usuário

## Descrição

Usuário clica em logout, o sistema encerra a sessão e redireciona para a página de login.

## Cenários

### Happy Path

1. Usuário está na página `/perfil` e clica em "Sair"
2. Server Action `realizarLogout` é chamada via `<form action={...}>`
3. Action chama `supabase.auth.signOut()` para invalidar a sessão
4. Action chama `redirect("/login")` — usuário é redirecionado para `/login`
5. Qualquer requisição autenticada subsequente falha (middleware redireciona para `/login`)

### Edge Cases

- Usuário já deslogado (sessão expirada): `signOut()` não falha — apenas redireciona para `/login`

### Cenário de Erro

- Não há cenário de erro visível ao usuário — `signOut()` não retorna erro crítico; em caso de falha, o redirect para `/login` ainda acontece

## Arquivos

- **Modificar:** `src/app/(auth)/perfil/actions.ts` — adicionar Server Action `realizarLogout()` que chama `signOut()` e redireciona para `/login`
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — envolver o botão "Sair" em `<form action={realizarLogout}>` com `type="submit"`

## Checklist

- [x] Adicionar `realizarLogout()` em `actions.ts` — chama `supabase.auth.signOut()` e `redirect("/login")`
- [x] Modificar `page.tsx`: trocar `<Button variant="outline">Sair</Button>` por `<form action={realizarLogout}><Button type="submit" variant="outline">Sair</Button></form>`
