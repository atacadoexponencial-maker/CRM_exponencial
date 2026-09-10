# 09: Mover card entre etapas via drag-and-drop

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar o drag-and-drop de cards entre colunas do kanban nos dois funis. Ao soltar o card em uma nova coluna, o sistema persiste a mudança de etapa no banco e o card aparece na coluna de destino.

A mudança de etapa também deve ser persistida pelo dropdown "Mover para etapa..." do `painel-card.tsx`, que já existe visualmente mas não persiste (issue 03). Esta issue conecta os dois mecanismos à mesma server action `moverCard`.

Abordagem de DnD: **HTML5 Drag and Drop API nativa** — sem nova dependência. `card-lead.tsx` recebe `draggable={true}` e `onDragStart`; `coluna-kanban.tsx` vira client component e recebe `onDragOver`/`onDrop`.

---

## Cenários

### Happy Path
1. Usuário arrasta um card de "Lead" para "Em Qualificação" → card aparece na nova coluna após refresh do servidor
2. Usuário abre o painel de um card e escolhe "Em Negociação" no dropdown → painel fecha o dropdown, dados são persistidos, página recarrega
3. Em ambos os casos, um registro é inserido em `pipeline_card_history` com `de_etapa`, `para_etapa` e `alterado_por`
4. O mesmo fluxo funciona no Funil de Retenção

### Edge Cases
- Usuário solta o card na mesma coluna de onde veio → nenhuma ação (verificado por `deEtapa !== paraEtapa`)
- Usuário solta o card fora de qualquer coluna → `onDrop` não dispara, nada acontece

### Cenário de Erro
Falha no banco ao atualizar → erro lançado pela server action; frontend pode exibir toast futuro (não implementado nesta issue); `router.refresh()` não é chamado; card permanece na posição original.

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - Política UPDATE: membros do workspace podem atualizar `etapa` e `etapa_changed_at` dos cards do próprio workspace

- Tabela: `pipeline_card_history`
  - Política INSERT: membros do workspace podem inserir registros para cards do próprio workspace

---

## Arquivos

- **Criar:** `supabase/migrations/20260526000004_pipeline_cards_update_and_history_insert.sql` — UPDATE policy em `pipeline_cards` para membros do workspace; INSERT policy em `pipeline_card_history` para membros do workspace
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `moverCard(cardId, novaEtapa)`: busca etapa atual, atualiza `etapa` e `etapa_changed_at`, insere em `pipeline_card_history`
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — adicionar `draggable={true}` e `onDragStart` que seta `dataTransfer` com `cardId` e `deEtapa`
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — adicionar `"use client"`; adicionar props `etapaId: string` e `onCardDrop?: (cardId, deEtapa, paraEtapa) => void`; adicionar `isDragOver` state; tratar `onDragOver`, `onDragLeave`, `onDrop`; aplicar ring visual quando `isDragOver`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — adicionar `handleMoverCard(cardId, deEtapa, paraEtapa)` que chama `moverCard()` e `router.refresh()`; passar `etapaId={etapa.id}` e `onCardDrop={handleMoverCard}` para cada `<ColunaKanban>`; passar `onMover={() => router.refresh()}` para `<PainelCard>`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — mesmas alterações que `funil-expansao.tsx`
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — adicionar prop `onMover?: () => void`; importar `moverCard` de `../actions`; nos botões do dropdown de etapa, chamar `moverCard(card.id, e.id).then(() => { setEtapaDropdownAberto(false); onMover?.() }).catch(() => {})`; adicionar estado `movendo` para desabilitar botões durante a chamada

> Reutilizar: `createClient` de `@/integrations/supabase/server` (já em `actions.ts`); `useRouter` de `next/navigation` (já em `funil-expansao.tsx`); `moverCard` de `../actions` (importar em `painel-card.tsx`).

---

## Checklist

- [x] Criar `supabase/migrations/20260526000004_pipeline_cards_update_and_history_insert.sql`: UPDATE policy em `pipeline_cards` para `workspace_id = workspace_id do usuário`; INSERT policy em `pipeline_card_history` para cards do mesmo workspace
- [x] Adicionar `moverCard(cardId: string, novaEtapa: string): Promise<void>` em `actions.ts`: buscar etapa atual do card; atualizar `etapa` e `etapa_changed_at`; inserir em `pipeline_card_history` com `de_etapa`, `para_etapa`, `alterado_por = user.id`
- [x] Modificar `card-lead.tsx`: adicionar `draggable={true}` no `<div>` raiz; adicionar `onDragStart={(e) => { e.dataTransfer.setData("cardId", card.id); e.dataTransfer.setData("deEtapa", card.etapa) }}`
- [x] Modificar `coluna-kanban.tsx`: adicionar `"use client"`; adicionar props `etapaId: string` e `onCardDrop?`; adicionar `isDragOver` state com `useState`; tratar `onDragOver` (preventDefault + setIsDragOver(true)), `onDragLeave` (setIsDragOver(false)), `onDrop` (lê dataTransfer, filtra drop na mesma etapa, chama `onCardDrop`, reseta isDragOver); adicionar ring visual `ring-2 ring-primary/40` quando `isDragOver`
- [x] Modificar `funil-expansao.tsx`: adicionar `async function handleMoverCard` que chama `moverCard()` sem aguardar e chama `router.refresh()`; passar `etapaId={etapa.id}` e `onCardDrop={handleMoverCard}` para cada `<ColunaKanban>`; passar `onMover={() => router.refresh()}` para `<PainelCard>`
- [x] Modificar `funil-retencao.tsx`: mesmas 3 alterações de `funil-expansao.tsx` (handleMoverCard, etapaId/onCardDrop em ColunaKanban, onMover em PainelCard)
- [x] Modificar `painel-card.tsx`: adicionar prop `onMover?: () => void`; importar `moverCard` de `../actions`; adicionar `useState` `movendo`; nos botões do dropdown, chamar `moverCard` + `onMover` no `.then()`; desabilitar botões quando `movendo`
