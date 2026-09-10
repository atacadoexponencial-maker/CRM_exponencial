# 06: Buscar card por contato

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar a busca de cards por nome de contato ou número de telefone nos dois funis. O resultado deve filtrar os cards exibidos no kanban em tempo real conforme o usuário digita, respeitando as regras de visibilidade do papel do usuário.

A filtragem é feita no cliente sobre os cards já retornados pelo servidor — a visibilidade por papel é garantida pelo RLS na query (implementado na issue 04 para Expansão). Esta issue conecta o Funil de Retenção ao Supabase com a mesma lógica, para que a busca também respeite as regras de visibilidade nesse funil.

---

## Cenários

### Happy Path
1. Admin ou Gerente digita "padaria" no campo de busca do Funil de Expansão → apenas os cards cujo contato contém "padaria" no nome ou telefone são exibidos; os demais somem em tempo real
2. O mesmo comportamento ocorre no Funil de Retenção
3. Ao apagar a busca, todos os cards visíveis para o usuário voltam a aparecer
4. Atendente usa a busca → filtra apenas os cards que são seus (já garantido pelo RLS)

### Edge Cases
- Busca sem resultados → todas as colunas exibem estado vazio ("Nenhum lead nesta etapa" / "Nenhum cliente nesta etapa")
- Busca pelo número de telefone parcial (ex: "99001") → card aparece se o número contém a substring
- Letras maiúsculas ou minúsculas → busca case-insensitive (já implementada com `.toLowerCase()`)

### Cenário de Erro
Não aplicável para a busca (client-side). O erro de carregamento dos dados já é tratado pela Server Action de cada funil.

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards` — modificar a restrição CHECK de `etapa` para incluir as 7 etapas de Retenção; adicionar coluna `funil` para distinguir os funis

---

## Arquivos

- **Criar:** `supabase/migrations/20260526000002_pipeline_cards_retencao_stages.sql` — adiciona coluna `funil` (`expansao` | `retencao`) com valor padrão `expansao`; remove a CHECK constraint atual de `etapa` e recria incluindo as etapas de Retenção
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `listarCardsRetencao()`: mesma estrutura de `listarCardsExpansao()` mas filtra por `funil = 'retencao'`; retorna `CardCliente[]`
- **Modificar:** `src/app/(auth)/pipeline/retencao/page.tsx` — transformar em `async`, chamar `listarCardsRetencao()` e `supabase.from("profiles")` para obter `papel`, passar ambos para `FunilRetencao`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — adicionar prop `papel: string` na interface (não usado em UI nesta issue — preparação para futura issue de "Novo cliente")

> Reutilizar: `createClient` de `@/integrations/supabase/server`; `calcularTempoNaEtapa` já existe em `actions.ts` (extrair para função compartilhada dentro do mesmo arquivo); tipo `CardCliente` e `EtapaRetencao` de `./mock-pipeline`.

---

## Checklist

- [x] Criar `supabase/migrations/20260526000002_pipeline_cards_retencao_stages.sql`: `ALTER TABLE pipeline_cards ADD COLUMN funil text NOT NULL DEFAULT 'expansao' CHECK (funil IN ('expansao', 'retencao'))`; `ALTER TABLE pipeline_cards DROP CONSTRAINT` da etapa atual e recriar com todas as 12 etapas (5 de Expansão + 7 de Retenção)
- [x] Adicionar `listarCardsRetencao(): Promise<CardCliente[]>` em `actions.ts`: query `pipeline_cards` com `eq("funil", "retencao")` + joins de contacts, profiles e labels; mapeia para `CardCliente[]` com `etapa` como `EtapaRetencao`
- [x] Modificar `retencao/page.tsx`: adicionar `async`, buscar `profile.role` via Supabase, chamar `listarCardsRetencao()`, passar `cards` e `papel` para `<FunilRetencao>`
- [x] Modificar `funil-retencao.tsx`: adicionar prop `papel: string` na interface `FunilRetencaoProps` (sem uso em UI por ora)
