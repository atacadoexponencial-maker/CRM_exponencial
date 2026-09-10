# 16: Editar papel de usuário

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin altera o papel de um usuário existente (Gerente ou Atendente). O sistema deve impedir que o Admin altere o próprio papel.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/usuarios` — vê a lista de usuários.
2. Admin clica em "⋯" → "Editar papel" para um usuário que não é ele mesmo.
3. Um dialog abre mostrando o nome do usuário e um select com o papel atual pré-selecionado.
4. Admin escolhe o novo papel e clica em "Salvar".
5. A Server Action valida, atualiza `profiles.role` e retorna sucesso.
6. O dialog fecha e a lista recarrega com o papel atualizado.

### Edge Cases
- Usuário com papel Admin: o item "Editar papel" no dropdown deve estar desabilitado para o próprio Admin (não pode alterar o próprio papel).
- O select só oferece "Gerente" e "Atendente" — Admin nunca pode ser atribuído via este fluxo.

### Cenário de Erro
- Tentativa de alterar o próprio papel: retorna `{ erro: "Você não pode alterar o próprio papel" }`.
- Não-admin tenta chamar a action: retorna `{ erro: "Sem permissão" }`.
- Falha de banco: exibe "Não foi possível alterar o papel. Tente novamente." no dialog.

## Banco de Dados

- Tabela: `profiles`
  - `role` (text) — atualizado para `'gerente'` ou `'atendente'` via service role key (necessário pois a policy de UPDATE só permite `id = auth.uid()`)

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — "use client"; renderiza o DropdownMenu + estado do dialog de edição de papel para um único usuário; recebe `usuario` (id, name, role, status) e `ehEuMesmo` como props
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — adicionar `editarPapel(usuarioId, novoPapel)`
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — substituir o DropdownMenu inline por `<AcoesUsuario>`, passando o ID do usuário autenticado para calcular `ehEuMesmo`

> Reutilizar: `Dialog`, `DialogTrigger`, `DialogPopup`, `DialogTitle`, `DialogClose` de `src/components/ui/dialog.tsx`; `Button` de `src/components/ui/button.tsx`; `Label` de `src/components/ui/label.tsx`; `DropdownMenu*` de `src/components/ui/dropdown-menu.tsx`.

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Adicionar `editarPapel(usuarioId, novoPapel)` em `actions.ts` com guard de admin, verificação de self-edit e update via service role key
- [x] Criar `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` com DropdownMenu + dialog de editar papel
- [x] Atualizar `page.tsx`: substituir DropdownMenu inline por `<AcoesUsuario>`, passar `ehEuMesmo={usuario.id === user.id}`
