# 06: Filtrar Contatos

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Usuário aplica um ou mais filtros simultaneamente (classificação, tipo, nicho, atendente responsável) e a lista exibe apenas os contatos que correspondem a todos os filtros ativos.

> **Nota:** A UI de filtros (chips de classificação, tipo, nicho, atendente) já existe em `lista-contatos.tsx` (do protótipo). O trabalho desta issue é: (1) adicionar as colunas de metadados na tabela `contacts` via migration, (2) atualizar `actions.ts` para buscar esses campos reais, e (3) derivar o atendente via join com `profiles`.

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/contatos`
2. Clica no chip "Lead" — lista exibe apenas contatos com `classificacao = 'lead'`
3. Clica também em "Lojista" — lista exibe apenas leads do tipo lojista (filtros combinados)
4. Clica em um nicho (ex.: "Alimentação") — filtro de nicho se adiciona aos anteriores
5. Clica no nome de um atendente (visível para admin/gerente) — lista filtra por esse atendente
6. Indicador de total atualiza: "3 contatos"

### Edge Cases
- Filtro de nicho aparece apenas se houver contatos com nicho preenchido
- Filtro de atendente aparece apenas para admin/gerente e somente se houver atendentes associados
- Combinação de filtros sem resultado: exibe "Nenhum contato encontrado"
- Contato sem `atendente_id`: campo `atendente` fica `null` e não aparece como opção no filtro

### Cenário de Erro
- Erro na query: `listarContatos()` retorna array vazio (comportamento já existente — não quebra a página)

## Banco de Dados

- Tabela: `contacts` — adicionar colunas:
  - `classificacao` (text, not null, default `'sem_historico'`) — classificação do contato; valores: lead, ativo, em_risco, inativo, perdido, sem_historico
  - `tipo` (text, nullable) — tipo do contato; valores: lojista, revendedor, empreendedor
  - `nicho` (text, nullable) — segmento de mercado do contato
  - `cidade` (text, nullable) — cidade do contato
  - `atendente_id` (uuid, nullable, FK → profiles) — atendente responsável pelo contato

## Arquivos

- **Criar:** `supabase/migrations/20260603000000_add_contact_metadata.sql` — adiciona `classificacao`, `tipo`, `nicho`, `cidade`, `atendente_id` à tabela `contacts`
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — selecionar os novos campos e fazer join com `profiles` para obter o nome do atendente
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — remover o campo `atendente` do tipo `Contato` (substituído por lógica real via join); ou manter como campo derivado — verificar impacto

## Checklist

- [x] Criar migration `20260603000000_add_contact_metadata.sql` com as 5 novas colunas
- [x] Atualizar `listarContatos()` em `actions.ts`: selecionar `classificacao`, `tipo`, `nicho`, `cidade` e fazer join `atendente_id → profiles.name`
- [x] Mapear `name` do atendente no campo `atendente` do tipo `Contato`
- [x] Verificar que os chips de filtro aparecem corretamente quando há dados reais
