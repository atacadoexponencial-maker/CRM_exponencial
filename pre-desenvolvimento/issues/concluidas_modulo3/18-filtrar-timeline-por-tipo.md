# 18: Filtrar Timeline por Tipo de Evento

**Tipo:** Implementação
**Página:** Timeline do Contato

## Descrição

Usuário seleciona um ou mais tipos de evento no filtro da timeline e a lista exibe apenas os eventos dos tipos selecionados.

## Cenários

### Happy Path
1. Usuário abre a aba Timeline
2. Clica em "Compra" — apenas compras são exibidas (botão fica ativo)
3. Clica em "Etapa" sem desselecionar "Compra" — compras e etapas são exibidas (dois botões ativos)
4. Clica em "Todos" — filtros são limpos, todos os eventos são exibidos

### Edge Cases
- Nenhum tipo selecionado (estado inicial): exibe todos os eventos (equivale a "Todos")
- Clicar num tipo já ativo: desativa aquele tipo; se nenhum tipo ativo restar, volta a exibir tudo
- Filtro ativo mas sem eventos do tipo: exibe "Nenhum evento encontrado para este filtro"

### Cenário de Erro
- Não há cenário de erro — é filtragem puramente client-side

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/[id]/components/timeline-contato.tsx` — mudar estado de `TipoEvento | "todos"` para `Set<TipoEvento>`; atualizar lógica de filtragem e estilo dos botões para refletir multi-seleção

## Checklist

- [x] `timeline-contato.tsx`: trocar `useState<TipoEvento | "todos">("todos")` por `useState<Set<TipoEvento>>(new Set())`
- [x] `timeline-contato.tsx`: botão "Todos" limpa o Set (clicável quando nenhum filtro ativo ou sempre); botões de tipo adicionam/removem do Set
- [x] `timeline-contato.tsx`: lógica de filtragem usa `set.size === 0` para exibir tudo, senão filtra pelos tipos no Set
- [x] `timeline-contato.tsx`: estilo ativo aplicado a cada botão individualmente (múltiplos podem estar ativos ao mesmo tempo)
