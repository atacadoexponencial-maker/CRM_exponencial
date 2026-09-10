# 10: Registrar histórico de movimentação ao mudar etapa

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Ao mover um card entre etapas (via drag-and-drop ou dropdown do painel), o sistema deve registrar no banco a data, hora, etapa anterior, etapa nova e o usuário responsável pela movimentação. Esse histórico fica disponível no Painel do Card.

> **Nota:** Esta issue foi integralmente implementada de forma antecipada durante as issues 08 e 09. Nenhum arquivo adicional precisa ser criado ou modificado.

---

## Cenários

### Happy Path
1. Usuário move um card via drag-and-drop → `moverCard` registra em `pipeline_card_history`: `de_etapa`, `para_etapa`, `alterado_por = user.id`, `created_at = now()`
2. Usuário move um card pelo dropdown do painel → mesmo registro criado pela mesma server action
3. Usuário abre o painel do card → histórico exibe a lista cronológica de movimentações com etapa destino, data e nome do responsável

### Edge Cases
- Primeiro registro do card (sem histórico anterior) → `de_etapa` é null, `para_etapa` é a etapa inicial; exibido normalmente no painel

### Cenário de Erro
Falha na inserção do histórico → erro silencioso; `moverCard` não lança erro por falha no histórico (o UPDATE já foi persistido); histórico fica incompleto para aquela movimentação.

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_card_history` — criada na migration `20260526000003`
  - `id` (uuid, PK)
  - `card_id` (uuid, FK pipeline_cards ON DELETE CASCADE)
  - `de_etapa` (text, nullable)
  - `para_etapa` (text, NOT NULL)
  - `alterado_por` (uuid, FK profiles)
  - `created_at` (timestamptz, DEFAULT now())
  - RLS SELECT: workspace match via pipeline_cards (criada na migration `20260526000003`)
  - RLS INSERT: workspace match via pipeline_cards (criada na migration `20260526000004`)

---

## Arquivos

> Nenhum arquivo precisa ser tocado — tudo foi implementado nas issues 08 e 09.

Referência ao que foi implementado:
- `supabase/migrations/20260526000003_create_pipeline_card_history_and_notes.sql` — tabela + SELECT policy
- `supabase/migrations/20260526000004_pipeline_cards_update_and_history_insert.sql` — INSERT policy
- `src/app/(auth)/pipeline/actions.ts` — `moverCard` insere histórico; `buscarDadosPainel` lê histórico com join de profiles
- `src/app/(auth)/pipeline/components/painel-card.tsx` — exibe histórico com etapa, data e responsável

---

## Checklist

- [x] Tabela `pipeline_card_history` criada com campos `de_etapa`, `para_etapa`, `alterado_por`, `created_at` — issue 08
- [x] RLS SELECT em `pipeline_card_history` — issue 08
- [x] RLS INSERT em `pipeline_card_history` — issue 09
- [x] `moverCard` em `actions.ts` insere registro em `pipeline_card_history` a cada mudança de etapa — issue 09
- [x] `buscarDadosPainel` em `actions.ts` retorna histórico com join de `profiles` (nome do responsável) — issue 08
- [x] `painel-card.tsx` exibe histórico com etapa, data e nome do responsável — issue 08
