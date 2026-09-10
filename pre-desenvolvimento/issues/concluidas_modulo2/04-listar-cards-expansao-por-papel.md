# 04: Listar cards do Funil de Expansão por papel

**Tipo:** Implementação
**Página:** Funil de Expansão

## Descrição

Conectar o Funil de Expansão ao Supabase para que Admin e Gerente vejam todos os cards do workspace, enquanto Atendente vê apenas os cards atribuídos a ele. Isolamento multi-tenant obrigatório: usuário de outro workspace não pode ver cards alheios.

---

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/pipeline` — vê todos os cards do workspace nas colunas corretas
2. Atendente acessa `/pipeline` — vê apenas os cards onde `atendente_id = auth.uid()`
3. Cards exibem nome e telefone do contato, nome do atendente (ou `null`), tempo na etapa e etiquetas
4. Colunas sem cards mostram estado vazio normalmente

### Edge Cases
- Workspace sem nenhum card → todas as colunas vazias
- Atendente sem cards atribuídos → todas as colunas vazias
- Card com atendente_id nulo → coluna exibe "Sem atendente" (já tratado no `CardLeadItem`)
- Card sem etiquetas → `etiquetas: []` (já tratado no `CardLeadItem`)

### Cenário de Erro
- Supabase indisponível ou erro de query → `page.tsx` lança erro (Next.js trata via error boundary ou página de erro padrão)
- Usuário sem perfil no workspace → RLS bloqueia, retorna array vazio

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `id` (uuid, PK) — identificador único do card
  - `workspace_id` (uuid, FK workspaces) — isolamento multi-tenant
  - `contact_id` (uuid, FK contacts) — contato associado ao lead
  - `etapa` (text) — etapa atual; valores: `lead | em_qualificacao | catalogo_enviado | em_negociacao | primeira_compra`
  - `atendente_id` (uuid, FK profiles, nullable) — responsável pelo card
  - `etapa_changed_at` (timestamptz) — momento em que entrou na etapa atual; usado para calcular tempo na etapa
  - `created_at` (timestamptz)
  - RLS SELECT: `workspace_id` do card = `workspace_id` do usuário autenticado **E** (papel = admin/gerente **OU** `atendente_id = auth.uid()`)

- Tabela: `pipeline_card_labels`
  - `card_id` (uuid, FK pipeline_cards, ON DELETE CASCADE)
  - `label_id` (uuid, FK labels, ON DELETE CASCADE)
  - PK composta `(card_id, label_id)`
  - RLS SELECT: herda acesso via join com `pipeline_cards`

---

## Arquivos

- **Criar:** `supabase/migrations/20260526000000_create_pipeline_cards.sql` — tabela `pipeline_cards` com CHECK de etapas válidas e RLS por papel; tabela `pipeline_card_labels` com RLS
- **Criar:** `src/app/(auth)/pipeline/actions.ts` — Server Action `listarCardsExpansao()`: autentica via Supabase SSR, consulta `pipeline_cards` com join de `contacts` (nome, telefone), `profiles` (nome do atendente), e `pipeline_card_labels` + `labels` (etiquetas); calcula `tempoNaEtapa` a partir de `etapa_changed_at`; retorna `CardLead[]`
- **Modificar:** `src/app/(auth)/pipeline/page.tsx` — transformar em async server component, chamar `listarCardsExpansao()` e passar resultado para `FunilExpansao` (substituindo `MOCK_CARDS_EXPANSAO`)

> Reutilizar: `createClient` de `@/integrations/supabase/server`; tipo `CardLead` e `EtapaExpansao` de `./mock-pipeline`. `FunilExpansao` não precisa ser modificado — sua interface `cards: CardLead[]` já é compatível.

---

## Checklist

- [x] Criar `supabase/migrations/20260526000000_create_pipeline_cards.sql` com: tabela `pipeline_cards` (id, workspace_id, contact_id, etapa com CHECK, atendente_id, etapa_changed_at, created_at); política RLS SELECT com filtro por workspace_id E (papel admin/gerente OU atendente_id = auth.uid()); tabela `pipeline_card_labels` (card_id, label_id, PK composta) com política RLS SELECT
- [x] Criar `src/app/(auth)/pipeline/actions.ts` com função `listarCardsExpansao()`: usa `createClient` SSR, query `pipeline_cards` com join de contacts, profiles e labels; mapeia resultado para `CardLead[]` com `tempoNaEtapa` calculado em dias/semanas a partir de `etapa_changed_at`
- [x] Modificar `src/app/(auth)/pipeline/page.tsx`: adicionar `async`, chamar `await listarCardsExpansao()` e passar o resultado para `<FunilExpansao cards={cards} />`
