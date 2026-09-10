# 25: Gerenciar membros do time

**Tipo:** Implementação
**Página:** Gestão de Times

## Descrição

Admin adiciona ou remove usuários de um time diretamente pela tela de gestão de times.

## Cenários

### Happy Path
1. Admin clica em `⋯` de qualquer time (padrão ou personalizado)
2. Seleciona "Gerenciar membros" no dropdown
3. Um dialog abre com checkboxes de todos os usuários do workspace, pré-marcados com os membros atuais
4. Admin marca/desmarca usuários e clica em "Salvar"
5. A action `gerenciarMembrosTime` apaga as associações existentes e insere as novas em `user_teams`
6. O dialog fecha e a lista de membros é atualizada

### Edge Cases
- Nenhum usuário selecionado → todos os membros são removidos do time (time fica vazio)
- Usuário já é membro → permanece marcado por padrão ao abrir o dialog
- Workspace sem usuários → dialog exibe mensagem "Nenhum usuário disponível"
- Admin fecha o dialog sem salvar → seleção original é restaurada ao reabrir

### Cenário de Erro
- Time não pertence ao workspace do admin → action retorna `{ erro: "Time não encontrado" }`
- Usuário não é admin → action retorna `{ erro: "Sem permissão" }`
- Erro de banco → exibe "Não foi possível salvar. Tente novamente."

## Banco de Dados (se aplicável)

- Tabela: `user_teams`
  - DELETE WHERE `team_id = timeId` (remove todas as associações atuais do time)
  - INSERT `{ user_id, team_id }` para cada usuário selecionado

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/times/actions.ts` — adicionar `listarUsuariosDoWorkspace(): Promise<{ id: string; name: string }[]>` e `gerenciarMembrosTime(timeId: string, usuariosIds: string[]): Promise<{ erro?: string }>`
- **Modificar:** `src/app/(auth)/configuracoes/times/acoes-time.tsx` — adicionar props `isDefault`, `membrosAtuaisIds` e `todosUsuarios`; adicionar "Gerenciar membros" no dropdown (todos os times); exibir "Editar nome" e "Excluir" apenas para `!isDefault`; adicionar dialog de checkboxes seguindo padrão de "Gerenciar times" em `acoes-usuario.tsx`
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — chamar `listarUsuariosDoWorkspace()`, passar `isDefault`, `membrosAtuaisIds` e `todosUsuarios` para `<AcoesTime>`, renderizar `<AcoesTime>` para todos os times (remover condição `!time.isDefault`)

## Checklist

- [x] Adicionar `listarUsuariosDoWorkspace` e `gerenciarMembrosTime` em `actions.ts`
- [x] Atualizar `acoes-time.tsx` com novas props, item "Gerenciar membros" e dialog de checkboxes
- [x] Atualizar `page.tsx` para buscar usuários e passar props a `<AcoesTime>` em todos os times
