# 17: Adicionar usuário a um time

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin adiciona um usuário a um ou mais times a partir da tela de gestão de usuários.

## Cenários

### Happy Path
1. Admin abre o menu "Ações" de um usuário na tabela de gestão de usuários.
2. Admin clica em "Gerenciar times".
3. Dialog abre com checkboxes para todos os times do workspace, com os times atuais do usuário já marcados.
4. Admin marca/desmarca os times desejados e clica em "Salvar".
5. A server action substitui as entradas de `user_teams` do usuário (para os times do workspace).
6. Dialog fecha, a página recarrega e a coluna "Times" do usuário é atualizada.

### Edge Cases
- Usuário ainda sem nenhum time: dialog abre com todos os checkboxes desmarcados.
- Admin desmarca todos os times e salva: todas as associações do usuário são removidas.
- Workspace sem times cadastrados: o item "Gerenciar times" pode abrir um dialog com mensagem "Nenhum time disponível".

### Cenário de Erro
- Falha no banco ao salvar: mensagem de erro inline no dialog — "Não foi possível salvar os times. Tente novamente."
- Admin tenta gerenciar os próprios times: permitido (não há restrição para isso).

## Banco de Dados

- Tabela: `user_teams`
  - `user_id` (uuid) — ID do profile do usuário
  - `team_id` (uuid) — ID do time
  - PK composta `(user_id, team_id)`
- Política RLS "Admins gerenciam membros de times do próprio workspace" já cobre `insert`, `update`, `delete`.

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — adicionar `timesIds: string[]` em `UsuarioListado`, populá-lo em `listarUsuarios`, e criar a nova action `gerenciarTimes`.
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — adicionar `times: Team[]` e `timesIds: string[]` ao tipo `Usuario`, adicionar estado e dialog "Gerenciar times", conectar o item do dropdown.
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — passar `times={times ?? []}` para `<AcoesUsuario>`.

## Checklist

- [x] Adicionar `timesIds: string[]` ao tipo `UsuarioListado` em `actions.ts`
- [x] Populá-lo em `listarUsuarios` (já existe `user_teams` na query — extrair os IDs)
- [x] Criar `gerenciarTimes(usuarioId, timesIds)`: validar admin, deletar entradas antigas do workspace, insertar novas
- [x] Em `acoes-usuario.tsx`: adicionar prop `times: Team[]` e `timesIds: string[]` no tipo `Usuario`
- [x] Adicionar estado `dialogTimesAberto`, `timesSelecionados`, `erroTimes`, `salvandoTimes`
- [x] Conectar o item "Gerenciar times" do dropdown ao novo dialog
- [x] Em `page.tsx`: passar `times={times ?? []}` para `<AcoesUsuario>`
