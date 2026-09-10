# 20: Mudar etapa do card pelo dropdown do painel

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar o dropdown de mudança de etapa no painel do card. O usuário seleciona uma etapa diferente no dropdown e o sistema persiste a mudança, atualiza o kanban e registra a movimentação no histórico — mesmo efeito do drag-and-drop no kanban.

## Análise do Estado Atual

O dropdown já chama `moverCard`, persiste no Supabase e registra o histórico. O problema pendente: após mover, o painel permanece aberto exibindo dados **stale** (etapa antiga, tempoNaEtapa desatualizado). Para ter "o mesmo efeito do drag-and-drop" — que não exibe painel — o painel deve fechar após mover com sucesso.

## Cenários

### Happy Path
1. Usuário clica em um card e o painel abre
2. Usuário abre o dropdown "Mover para etapa..." e seleciona uma etapa diferente
3. `moverCard` é chamado, persiste no banco e registra histórico
4. Ao concluir: painel fecha (`onFechar()`) e kanban atualiza (`onMover?.()`)
5. O card aparece na nova coluna; o painel não fica visível

### Edge Cases
- Mover para "Recompra Realizada" → modal de confirmação abre; após confirmar, painel fecha e kanban atualiza
- Cancelar o modal de confirmação → painel permanece aberto na etapa original
- Atribuir/reatribuir atendente (também usa `onMover`) → painel NÃO fecha (esse é o comportamento correto, essas ações não mudam de etapa)

### Cenário de Erro
- `moverCard` lança exceção → `.catch(() => {})` absorve; painel permanece aberto, kanban não atualiza

## Banco de Dados

Não aplicável — já implementado em `moverCard`.

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — no callback `.then()` do dropdown de etapas, adicionar `onFechar()` após `onMover?.()`. No callback de confirmação do modal `ModalConfirmacaoRecompra`, idem.

## Dependências Externas

Nenhuma.

## Checklist

- [x] No `.then()` do clique do dropdown de etapas em `painel-card.tsx` (linha com `setEtapaDropdownAberto(false); onMover?.()`), adicionar chamada a `onFechar()`
- [x] No `.then()` do callback `onConfirmar` do `ModalConfirmacaoRecompra` em `painel-card.tsx` (linha com `onMover?.()`), adicionar chamada a `onFechar()`
