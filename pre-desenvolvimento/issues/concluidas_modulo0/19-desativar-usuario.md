# 19: Desativar usuário

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin desativa um usuário, removendo seu acesso ao sistema sem excluir seus dados. O sistema deve impedir que o Admin desative a si mesmo.

## Cenários

### Happy Path
1. Admin abre o menu "Ações" de um usuário com status `active`.
2. Admin clica em "Desativar".
3. Dialog de confirmação abre — "Tem certeza que deseja desativar [nome]?"
4. Admin confirma clicando em "Desativar".
5. Action `desativarUsuario` atualiza `profiles.status` para `"inactive"`.
6. Dialog fecha, página recarrega, badge de status muda para "Inativo", menu exibe "Reativar".
7. Na próxima requisição do usuário desativado, o middleware detecta `status = "inactive"` e redireciona para `/login`.

### Edge Cases
- Usuário já inativo: o item "Desativar" não aparece (o menu já condiciona `active` vs `inactive`).
- Admin tenta desativar a si mesmo: item "Desativar" desabilitado (`disabled={ehEuMesmo}`).

### Cenário de Erro
- Falha no banco: mensagem inline no dialog — "Não foi possível desativar o usuário. Tente novamente."

## Banco de Dados

- Tabela: `profiles`
  - `status` (text) — `"active"` ou `"inactive"`; atualizado para `"inactive"` ao desativar

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — adicionar `desativarUsuario(usuarioId)` server action
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — adicionar `disabled={ehEuMesmo}` no item "Desativar", adicionar estado e dialog de confirmação, conectar action
- **Modificar:** `src/middleware.ts` — após `getUser()`, consultar `profiles.status`; se `"inactive"`, redirecionar para `/login`

## Checklist

- [x] Criar `desativarUsuario(usuarioId)`: validar admin, impedir auto-desativação, atualizar `status = "inactive"` no workspace correto
- [x] Em `acoes-usuario.tsx`: adicionar `disabled={ehEuMesmo}` no item "Desativar"
- [x] Adicionar estado `dialogDesativarAberto`, `erroDesativar`, `desativando`
- [x] Adicionar dialog de confirmação com botão "Desativar" destrutivo conectado à action
- [x] Em `middleware.ts`: consultar `profiles` após `getUser()`; redirecionar para `/login` se status for `"inactive"`
