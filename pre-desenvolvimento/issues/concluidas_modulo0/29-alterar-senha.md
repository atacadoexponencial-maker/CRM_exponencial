# 29: Alterar senha

**Tipo:** Implementação
**Página:** Perfil do Usuário

## Descrição

Usuário informa a senha atual, nova senha e confirmação. O sistema valida a senha atual antes de aceitar a troca e exibe erro se a senha atual estiver incorreta ou se as novas senhas não coincidirem.

## Cenários

### Happy Path

1. Usuário preenche "Senha atual", "Nova senha" e "Confirmar nova senha"
2. Clica em "Alterar senha"
3. Server Action verifica: `novaSenha === confirmarSenha`
4. Server Action chama `supabase.auth.signInWithPassword({ email, password: senhaAtual })` para verificar a senha atual
5. Se correto, chama `supabase.auth.updateUser({ password: novaSenha })`
6. Formulário é limpo (campos voltam para vazio) e exibe mensagem de sucesso

### Edge Cases

- Todos os campos são `required` — formulário HTML impede envio com campos vazios
- Nova senha com menos de 6 caracteres: Supabase rejeita e retorna erro (mínimo do Supabase Auth)
- Campos limpos após sucesso para evitar re-envio acidental

### Cenário de Erro

- Senha atual incorreta → "Senha atual incorreta."
- Nova senha e confirmação não coincidem → "As senhas não coincidem."
- Erro genérico do Supabase → "Não foi possível alterar a senha. Tente novamente."

## Arquivos

- **Modificar:** `src/app/(auth)/perfil/actions.ts` — adicionar Server Action `alterarSenha(senhaAtual, novaSenha, confirmarSenha)`
- **Criar:** `src/app/(auth)/perfil/form-alterar-senha.tsx` — Client Component com os 3 campos de senha, estado de alterando/erro/sucesso
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — substituir a seção "Segurança" estática pelo componente `<FormAlterarSenha />`

## Checklist

- [x] Adicionar `alterarSenha(senhaAtual, novaSenha, confirmarSenha)` em `actions.ts` — verifica `novaSenha === confirmarSenha`, valida senha atual via `signInWithPassword`, atualiza via `updateUser`
- [x] Criar `form-alterar-senha.tsx` — 3 inputs de senha, estado de `alterando`, mensagem de erro, limpeza dos campos após sucesso
- [x] Modificar `page.tsx` para usar `<FormAlterarSenha />` na seção "Segurança", removendo o formulário estático
