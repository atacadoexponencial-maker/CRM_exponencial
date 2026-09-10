# 12: Atribuir card sem atendente a um atendente

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar a atribuição de cards sem atendente. Admin ou Gerente seleciona um atendente para um card que está como "Sem atendente". O card passa a exibir o nome do atendente e fica visível para ele. Atendente não tem acesso a essa ação.

## Cenários

### Happy Path
1. Admin ou Gerente abre o `PainelCard` de um card com "Sem atendente"
2. Vê um dropdown "Atribuir atendente..." na seção de info do contato
3. Seleciona um atendente da lista
4. O backend atualiza `pipeline_cards.atendente_id`
5. A página atualiza via `router.refresh()` e o card passa a mostrar o nome do atendente

### Edge Cases
- Card já tem atendente: dropdown não é exibido (a issue cobre apenas cards sem atendente)
- Usuário com papel `atendente`: dropdown não é exibido
- Lista de atendentes vazia: dropdown exibe estado vazio

### Cenário de Erro
- Falha na Server Action: dropdown fecha sem atualizar (silencioso, sem toast — mesmo padrão do `moverCard`)

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `atendente_id` (uuid, FK → profiles) — atualizado com o ID do atendente selecionado

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `atribuirAtendente(cardId, atendenteId)` e mudar `listarAtendentes()` para retornar `{ id: string; nome: string }[]`
- **Modificar:** `src/app/(auth)/pipeline/page.tsx` — adaptar para novo tipo de `atendentes`
- **Modificar:** `src/app/(auth)/pipeline/retencao/page.tsx` — adaptar para novo tipo de `atendentes`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — adaptar tipo de `atendentes` e passar `papel` e `atendentes` ao `PainelCard`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — adaptar tipo de `atendentes` e passar `papel` e `atendentes` ao `PainelCard`
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — aceitar `papel` e `atendentes` como props; exibir dropdown de atribuição quando `card.atendente === null` e `papel !== "atendente"`; chamar `atribuirAtendente` ao selecionar e `onMover?.()` ao concluir

## Checklist

- [x] Mudar `listarAtendentes()` para retornar `{ id: string; nome: string }[]`
- [x] Adicionar `atribuirAtendente(cardId, atendenteId)` em `actions.ts` — atualiza `pipeline_cards.atendente_id`
- [x] Adaptar `pipeline/page.tsx` ao novo tipo de `atendentes` (sem mudança necessária — tipo flui automaticamente)
- [x] Adaptar `retencao/page.tsx` ao novo tipo de `atendentes` (sem mudança necessária — tipo flui automaticamente)
- [x] Adaptar `funil-expansao.tsx`: novo tipo em `FunilExpansaoProps.atendentes`, filtros por `.nome`, passar `papel` e `atendentes` ao `PainelCard`
- [x] Adaptar `funil-retencao.tsx`: novo tipo em `FunilRetencaoProps.atendentes`, filtros por `.nome`, passar `papel` e `atendentes` ao `PainelCard`
- [x] Em `painel-card.tsx`: aceitar `papel?: string` e `atendentes?: { id: string; nome: string }[]`; exibir dropdown de atribuição (mesmo padrão visual do dropdown "Mudar etapa") apenas quando `semAtendente && papel !== "atendente"`
