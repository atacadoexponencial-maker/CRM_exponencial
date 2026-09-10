# 24: Fechar painel e retornar ao kanban sem perder posição de scroll

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar o fechamento do painel lateral ao clicar no botão de fechar. O kanban deve retornar exatamente à posição de scroll onde o usuário estava antes de abrir o painel, sem recarregar ou perder o estado atual dos filtros e da busca.

> **Nota:** Esta funcionalidade já estava implementada quando a issue foi planejada. Nenhuma modificação é necessária.

## Cenários

### Happy Path
1. Usuário rola o kanban horizontalmente e/ou as colunas verticalmente
2. Usuário clica em um card — painel abre (overlay `fixed` não altera DOM do kanban)
3. Usuário clica no X ou no overlay → `onFechar()` → `setCardSelecionado(null)`
4. Painel fecha; kanban permanece exatamente na mesma posição de scroll
5. Filtros de busca e atendente continuam com os valores anteriores

### Edge Cases
- Usuário fecha o painel via overlay (clique fora): mesmo comportamento do X
- Usuário fecha o painel após mover o card (`onMover` → `router.refresh()`): neste caso o refresh recarrega os dados, mas é intencional — é a ação de mover, não de fechar

### Cenário de Erro
- Não aplicável: fechamento é operação local sem IO

## Arquivos

> Nenhum arquivo precisa ser criado ou modificado. A preservação do scroll já funciona pelo design do React:
>
> - `src/app/(auth)/pipeline/components/funil-expansao.tsx:54` — `onFechar={() => setCardSelecionado(null)}` não chama `router.refresh()`
> - `src/app/(auth)/pipeline/components/funil-retencao.tsx:64` — mesmo padrão
> - `src/app/(auth)/pipeline/components/painel-card.tsx:52–55` — overlay `fixed inset-0` não afeta o DOM do kanban
> - Os estados `busca` e `atendenteFiltro` vivem nos componentes de funil e sobrevivem à mudança de `cardSelecionado`
> - React preserva scroll nativo da `div.overflow-x-auto` do kanban durante re-renders sem desmontagem

## Checklist

- [x] Botão X fecha o painel sem chamar `router.refresh()`
- [x] Overlay (clique fora) fecha o painel sem chamar `router.refresh()`
- [x] Posição de scroll horizontal do kanban é preservada ao fechar
- [x] Posição de scroll vertical das colunas é preservada ao fechar
- [x] Estado de busca (`busca`) é preservado ao fechar
- [x] Estado de filtro de atendente (`atendenteFiltro`) é preservado ao fechar
