# 20: Reativar usuário

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin reativa um usuário previamente desativado, restaurando seu acesso ao sistema.

## Cenários

### Happy Path
1. Admin abre o menu "Ações" de um usuário com status `inactive`.
2. O menu exibe "Reativar" no lugar de "Desativar".
3. Admin clica em "Reativar".
4. Dialog de confirmação abre — "Tem certeza que deseja reativar [nome]?"
5. Admin confirma clicando em "Reativar".
6. Action `reativarUsuario` atualiza `profiles.status` para `"active"`.
7. Dialog fecha, página recarrega, badge de status muda para "Ativo", menu volta a exibir "Desativar".

### Edge Cases
- Usuário já ativo: o item "Reativar" não aparece (o menu já condiciona `active` vs `inactive`).

### Cenário de Erro
- Falha no banco: mensagem inline no dialog — "Não foi possível reativar o usuário. Tente novamente."

## Banco de Dados

- Tabela: `profiles`
  - `status` (text) — atualizado de `"inactive"` para `"active"` ao reativar

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — adicionar `reativarUsuario(usuarioId)` server action
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — conectar item "Reativar", adicionar estados e dialog de confirmação

## Checklist

- [x] Criar `reativarUsuario(usuarioId)`: validar admin, atualizar `status = "active"` no workspace correto
- [x] Importar `reativarUsuario` em `acoes-usuario.tsx`
- [x] Adicionar estados `dialogReativarAberto`, `erroReativar`, `reativando`
- [x] Adicionar função `handleReativar`
- [x] Conectar o `<DropdownMenuItem>Reativar</DropdownMenuItem>` existente ao dialog
- [x] Adicionar dialog de confirmação com botão "Reativar" conectado à action
