# 21: Listar times da empresa

**Tipo:** Implementação
**Página:** Gestão de Times

## Descrição

Exibir todos os times da empresa com nome, quantidade de membros e tipo (padrão ou personalizado), incluindo a lista de membros de cada time.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/times`.
2. A página busca os times via `listarTimes()`.
3. Times padrão (Expansão, Retenção) aparecem com badge "Padrão" (azul).
4. Times personalizados aparecem com badge "Personalizado" (roxo).
5. Cada card exibe nome, contagem de membros e a lista com avatar de iniciais de cada membro.
6. Times padrão não exibem o menu de ações (⋯).
7. Times personalizados exibem o menu com "Editar nome" e "Excluir" (stubs, implementados nas próximas issues).

### Edge Cases
- Empresa sem times personalizados: apenas Expansão e Retenção aparecem.
- Time sem membros: exibe "0 membros" e a área de membros fica vazia.
- Usuário não autenticado: redirecionado para `/login`.
- Usuário não-admin: redirecionado para `/perfil`.

### Cenário de Erro
- Falha na query: `listarTimes()` retorna `[]` e a página exibe lista vazia (sem mensagem de erro — o estado vazio é tratado como nenhum time cadastrado).

## Banco de Dados

- Tabela: `teams`
  - `id` (uuid) — identificador do time
  - `name` (text) — nome do time
  - `is_default` (boolean) — `true` para Expansão/Retenção, `false` para personalizados
- Tabela: `user_teams`
  - `user_id` (uuid) → `profiles.id` — membro do time
  - `team_id` (uuid) → `teams.id` — time ao qual pertence
- Tabela: `profiles`
  - `name` (text) — nome do membro exibido no card

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/times/actions.ts` — server action `listarTimes()` que retorna os times do workspace com membros
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — substituir mock data por chamada real a `listarTimes()`, adicionar auth check e redirect para não-admin

## Checklist

- [x] Criar `listarTimes()` em `actions.ts`: autenticar usuário, verificar admin, buscar times com membros via join `user_teams(profiles(id, name))`
- [x] Ordenar times: padrão primeiro (`is_default DESC`), depois por nome
- [x] Modificar `page.tsx`: importar `listarTimes`, adicionar auth check + redirect para `/perfil` se não-admin
- [x] Substituir mock `times` pelo resultado de `await listarTimes()`
- [x] Mapear `is_default` para o label "Padrão" / "Personalizado" no JSX
