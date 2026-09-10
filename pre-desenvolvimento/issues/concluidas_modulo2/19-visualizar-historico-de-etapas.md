# 19: Visualizar histórico de etapas no painel do card

**Tipo:** Implementação
**Página:** Painel do Card

## Descrição

Implementar a listagem do histórico de movimentações no painel do card, em ordem cronológica. Cada entrada deve exibir: data e hora da mudança, etapa anterior, etapa nova e nome do usuário que realizou a movimentação. A primeira entrada registra a etapa inicial na criação do card.

## Cenários

### Happy Path
1. Usuário abre painel de um card que foi movido 3 vezes
2. Histórico exibe 3 entradas em ordem cronológica crescente
3. Cada entrada mostra: data/hora, "Etapa A → Etapa B", responsável
4. A primeira entrada mostra `de_etapa` como a etapa inicial do card

### Edge Cases
- Card nunca foi movido → histórico vazio, exibe "Nenhum histórico disponível."
- Responsável não encontrado (user deletado) → exibe sem nome, sem quebrar a tela

### Cenário de Erro
- Falha na query → `buscarDadosPainel` já trata com `.catch(() => {})` no painel; histórico permanece vazio

## Banco de Dados (se aplicável)

- Tabela: `pipeline_card_history`
  - `de_etapa` (text) — etapa de onde o card saiu (já existe, mas não estava sendo buscado)
  - `para_etapa` (text) — etapa para onde o card foi
  - `created_at` (timestamptz) — data e hora da movimentação
  - `alterado_por` (uuid FK profiles) — usuário que realizou a mudança

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — adicionar `deEtapa: string` em `HistoricoEtapa`; atualizar mocks de `MOCK_PAINEL_DATA` com o novo campo e adicionar hora no campo `data`
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — incluir `de_etapa` na query de `buscarDadosPainel`; formatar `data` com data e hora (`toLocaleString("pt-BR")`); mapear `deEtapa` no objeto retornado
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — atualizar exibição do histórico para mostrar `deEtapa → etapa` e a hora

## Dependências Externas

Nenhuma.

## Checklist

- [x] Adicionar `deEtapa: string` em `HistoricoEtapa` em `mock-pipeline.ts`
- [x] Atualizar `MOCK_PAINEL_DATA` com `deEtapa` em cada entrada e hora no campo `data`
- [x] Em `buscarDadosPainel` (actions.ts): incluir `de_etapa` no select; formatar `data` com `toLocaleString("pt-BR")`; mapear `deEtapa: row.de_etapa`
- [x] Em `painel-card.tsx`: exibir cada entrada do histórico como "DeEtapa → Etapa" com data/hora e responsável
