# 18: Visualizar informações do contato no painel do card

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar o carregamento das informações do card no painel lateral com dados reais do Supabase: nome do contato, número de WhatsApp, etapa atual, funil atual, atendente responsável, data de entrada na etapa e tempo total no funil.

## Cenários

### Happy Path
1. Usuário clica em um card do kanban
2. Painel abre e exibe: nome, telefone, funil, etapa, atendente, tempo na etapa, **data de entrada na etapa** (ex.: "15/05/2026") e **tempo total no funil** (ex.: "3 meses")
3. Todos os dados vêm do Supabase via Server Actions já existentes

### Edge Cases
- Card com `etapa_changed_at` igual a `created_at` (card nunca foi movido) → ambos os campos calculados a partir do mesmo timestamp, sem problema
- Card recém-criado no mesmo dia → `dataEntradaEtapa` exibe a data de hoje; `tempoNoFunil` exibe "Hoje"

### Cenário de Erro
- Não aplicável — os dados já são carregados via `listarCardsExpansao` / `listarCardsRetencao`; se falharem, a página já trata o erro

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `etapa_changed_at` (timestamptz) — já existente; usado para calcular `dataEntradaEtapa`
  - `created_at` (timestamptz) — já existente; usado para calcular `tempoNoFunil`

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — adicionar campos `dataEntradaEtapa: string` e `tempoNoFunil: string` nas interfaces `CardLead` e `CardCliente`; atualizar dados mock com valores de exemplo
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — incluir `created_at` na query de `listarCardsExpansao` e `listarCardsRetencao`; calcular `dataEntradaEtapa` (formatar `etapa_changed_at` como `dd/MM/yyyy`) e `tempoNoFunil` (reutilizar `calcularTempoNaEtapa` passando `created_at`)
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — exibir `card.dataEntradaEtapa` e `card.tempoNoFunil` na seção de info do painel

## Dependências Externas

Nenhuma.

## Checklist

- [x] Adicionar `dataEntradaEtapa: string` e `tempoNoFunil: string` nas interfaces `CardLead` e `CardCliente` em `mock-pipeline.ts`
- [x] Atualizar `MOCK_CARDS_EXPANSAO` e `MOCK_CARDS_RETENCAO` com os novos campos preenchidos
- [x] Em `listarCardsExpansao` (actions.ts): incluir `created_at` na query e popular `dataEntradaEtapa` (formato `toLocaleDateString("pt-BR")` de `etapa_changed_at`) e `tempoNoFunil` (via `calcularTempoNaEtapa(created_at)`)
- [x] Em `listarCardsRetencao` (actions.ts): mesma alteração que `listarCardsExpansao`
- [x] Em `painel-card.tsx`: exibir `card.dataEntradaEtapa` (label "Entrada na etapa:") e `card.tempoNoFunil` (label "Tempo no funil:") na seção de info
