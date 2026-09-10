# 13: Reatribuir card de um atendente para outro

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar a reatribuição de cards já atribuídos. Admin ou Gerente troca o atendente responsável por um card. O card some da visão do atendente anterior e aparece para o novo atendente. Atendente não tem acesso a essa ação.

## Cenários

### Happy Path
1. Admin ou Gerente abre o `PainelCard` de um card que já tem atendente
2. Vê um dropdown "Reatribuir atendente..." (atendente atual excluído da lista)
3. Seleciona um atendente diferente
4. O backend atualiza `pipeline_cards.atendente_id` via `atribuirAtendente` (já existente)
5. A página atualiza via `router.refresh()` e o card exibe o novo atendente

### Edge Cases
- Card sem atendente: apenas o dropdown "Atribuir atendente..." da issue 12 aparece (este dropdown não é exibido)
- Usuário com papel `atendente`: dropdown não é exibido
- Lista de atendentes com apenas o atual: dropdown exibe estado vazio ("Nenhum atendente disponível")

### Cenário de Erro
- Falha na Server Action: dropdown fecha sem atualizar (silencioso — mesmo padrão de `moverCard` e `atribuirAtendente`)

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `atendente_id` (uuid, FK → profiles) — atualizado via `atribuirAtendente()` já existente em `actions.ts`

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — adicionar dropdown "Reatribuir atendente..." visível quando `!semAtendente && papel !== "atendente"`; excluir atendente atual da lista; reutilizar `atribuirAtendente` (já importado) e `onMover?.()` para refresh

## Checklist

- [x] Adicionar dropdown "Reatribuir atendente..." em `painel-card.tsx` — visível apenas quando `!semAtendente && papel !== "atendente"`
- [x] Excluir o atendente atual da lista de opções (filtrar por nome, pois `card.atendente` é string e `atendentes` tem `.nome`)
- [x] Reutilizar `atribuirAtendente` (já importado) para chamar o backend ao selecionar
- [x] Chamar `onMover?.()` ao concluir para acionar `router.refresh()`
