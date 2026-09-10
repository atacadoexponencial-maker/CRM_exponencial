# 16: Ciclo de recompra — mover para Aguardando Recompra após confirmação

**Tipo:** Implementação
**Página:** Funil de Retenção

## Descrição

Ao mover um card para a etapa "Recompra Realizada" no Funil de Retenção, o sistema exibe uma confirmação para o usuário. Após confirmação, o card é movido automaticamente para "Aguardando Recompra", sinalizando que o ciclo de recompra recomeça. Ambas as movimentações são registradas no histórico do card.

## Cenários

### Happy Path
1. Usuário arrasta card para "Recompra Realizada" (ou clica em "Mover para etapa → Recompra Realizada" no painel)
2. Modal de confirmação é exibido: "Confirmar recompra realizada? O card será movido para Aguardando Recompra automaticamente."
3. Usuário clica em "Confirmar"
4. `moverCard` é chamado com `novaEtapa = "recompra_realizada"` — registra histórico
5. Backend detecta a etapa e move automaticamente para `aguardando_recompra` — registra segundo histórico
6. A página é recarregada; o card aparece na coluna "Aguardando Recompra"

### Edge Cases
- Usuário cancela o modal → card não se move, nada é registrado
- Usuário arrasta via drag-and-drop → mesmo modal é exibido antes de confirmar
- Usuário usa o painel lateral para mover → mesmo modal é exibido

### Cenário de Erro
- Falha de rede ou erro Supabase → modal fecha sem mover o card; a página não é recarregada (comportamento atual de `.catch(() => {})`)

## Banco de Dados (se aplicável)

- Tabela: `pipeline_card_history`
  - `de_etapa` (text) — etapa anterior
  - `para_etapa` (text) — etapa destino (`recompra_realizada` e depois `aguardando_recompra`)
  - `alterado_por` (uuid) — id do usuário que acionou a movimentação

## Arquivos

- **Criar:** `src/app/(auth)/pipeline/components/modal-confirmacao-recompra.tsx` — modal de confirmação usando `Dialog`/`DialogPopup` de `@/components/ui/dialog`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — interceptar `handleMoverCard` quando `paraEtapa === "recompra_realizada"` para exibir o modal antes de chamar `moverCard`
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — interceptar clique no item "Recompra Realizada" do dropdown de etapas para exibir o modal
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — dentro de `moverCard`, quando `novaEtapa === "recompra_realizada"`, após registrar o primeiro histórico, mover automaticamente para `aguardando_recompra` e registrar o segundo histórico

## Dependências Externas

Nenhuma — `@/components/ui/dialog` já está disponível no projeto.

## Checklist

- [x] Criar `modal-confirmacao-recompra.tsx` com `Dialog`, `DialogPopup`, `DialogTitle`, `DialogDescription`, `DialogClose` de `@/components/ui/dialog`
- [x] Adicionar estado `confirmacaoPendente` em `funil-retencao.tsx` para segurar o `cardId`/`deEtapa`/`paraEtapa` enquanto aguarda confirmação
- [x] Interceptar drag-and-drop em `funil-retencao.tsx`: se `paraEtapa === "recompra_realizada"`, mostrar modal em vez de chamar `moverCard` diretamente
- [x] Interceptar clique no dropdown em `painel-card.tsx`: se `e.id === "recompra_realizada"`, mostrar modal em vez de chamar `moverCard` diretamente
- [x] Adicionar estado `confirmacaoRecompra` em `painel-card.tsx` (etapa destino pendente)
- [x] Em `actions.ts`, na função `moverCard`, detectar `novaEtapa === "recompra_realizada"` e executar segundo `update` + segundo `insert` no `pipeline_card_history` para `aguardando_recompra`
