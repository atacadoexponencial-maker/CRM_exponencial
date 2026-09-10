# 23: Reatribuir atendente responsável pelo painel do card

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar a ação de reatribuição de atendente dentro do painel do card. Admin ou Gerente pode trocar o atendente responsável pelo card diretamente no painel; a mudança reflete imediatamente no kanban. Atendente não tem acesso a essa ação.

> **Nota:** Esta funcionalidade já estava implementada quando a issue foi planejada. Nenhuma modificação é necessária.

## Cenários

### Happy Path
1. Admin ou Gerente abre o painel de um card que já tem atendente atribuído
2. Dropdown "Reatribuir atendente..." aparece (atendente atual excluído da lista)
3. Usuário seleciona novo atendente
4. `atribuirAtendente` é chamada, botão fica desabilitado durante a operação
5. Dropdown fecha e `onMover()` é chamado — kanban reflete a mudança imediatamente

### Edge Cases
- Apenas um atendente no workspace (mesmo que o atual): dropdown exibe "Nenhum atendente disponível"
- Card sem atendente atribuído: dropdown de reatribuição não aparece (apenas o de atribuição inicial aparece)
- Papel `atendente`: dropdown de reatribuição não é renderizado no frontend

### Cenário de Erro
- Falha na action: dropdown fecha, kanban não atualiza — atendente anterior permanece no card

## Banco de Dados

- Tabela: `pipeline_cards`
  - `atendente_id` (uuid) — atualizado pela action `atribuirAtendente`

## Arquivos

> Nenhum arquivo precisa ser criado ou modificado — a funcionalidade já está implementada nos arquivos abaixo:
>
> - `src/app/(auth)/pipeline/components/painel-card.tsx:172–207` — dropdown "Reatribuir atendente..." visível apenas para `!semAtendente && papel !== "atendente"`, filtra atendente atual, chama `atribuirAtendente` e depois `onMover()`
> - `src/app/(auth)/pipeline/actions.ts:47–68` — `atribuirAtendente` verifica `["admin", "gerente"].includes(profile.role)` no servidor antes de atualizar

## Checklist

- [x] Dropdown "Reatribuir atendente..." visível apenas para Admin e Gerente
- [x] Dropdown não aparece quando o card não tem atendente (condição `!semAtendente`)
- [x] Lista de atendentes exclui o atendente atual do card
- [x] Autorização verificada no servidor (`atribuirAtendente` bloqueia papel `atendente`)
- [x] Kanban reflete a mudança via `onMover()` após sucesso
- [x] Estado `atribuindo` desabilita botões durante a operação
