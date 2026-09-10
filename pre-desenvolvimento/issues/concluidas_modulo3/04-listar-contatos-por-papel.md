# 04: Listar Contatos por Papel

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Admin e Gerente visualizam todos os contatos do workspace; Atendente visualiza apenas os contatos cujas conversas ou cards de pipeline estão atribuídos a ele, com isolamento multi-tenant garantido por RLS.

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/contatos` — lista exibe todos os contatos do workspace (da tabela `contacts`)
2. Atendente acessa `/contatos` — lista exibe apenas contatos com conversa atribuída a ele OU card de pipeline atribuído a ele
3. Cada linha exibe nome, número de WhatsApp e campos opcionais nulos (tipo, nicho, cidade, atendente — ainda não existem no banco)
4. Isolamento multi-tenant: usuário da Empresa A não vê contatos da Empresa B (garantido por RLS na tabela `contacts`)

### Edge Cases
- Workspace sem contatos: lista exibe estado vazio ("Nenhum contato encontrado")
- Atendente sem conversas nem cards atribuídos: lista vazia
- Contato com `name` nulo no banco: exibe o `phone_number` como identificador

### Cenário de Erro
- Erro na query Supabase: `listarContatos()` retorna array vazio (falha silenciosa — página não quebra)

## Banco de Dados (se aplicável)

- Tabela: `contacts`
  - `id` (uuid) — chave primária
  - `workspace_id` (uuid) — FK para `workspaces`, usado pela RLS
  - `phone_number` (text) — número WhatsApp do contato
  - `name` (text, nullable) — nome do contato
  - `created_at` (timestamptz) — data de criação

- Tabela: `conversations`
  - `contact_id` (uuid) — FK para `contacts`, usada para filtrar por atendente
  - `assigned_to` (uuid, nullable) — FK para `profiles`

- Tabela: `pipeline_cards`
  - `contact_id` (uuid) — FK para `contacts`
  - `atendente_id` (uuid, nullable) — FK para `profiles`

## Arquivos

- **Criar:** `src/app/(auth)/contatos/actions.ts` — Server Action `listarContatos()`: para admin/gerente busca todos os contatos do workspace; para atendente busca IDs de contatos de `conversations.assigned_to` e `pipeline_cards.atendente_id`, depois filtra `contacts` com `.in()`
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — substituir `MOCK_CONTATOS` por `await listarContatos()` e remover o import de `MOCK_CONTATOS`

## Checklist

- [x] Criar `actions.ts` com `listarContatos()` que retorna `Contato[]` com dados reais; para admin/gerente retorna todos do workspace; para atendente filtra por `conversations.assigned_to` e `pipeline_cards.atendente_id`
- [x] Modificar `page.tsx` para chamar `listarContatos()` e remover dependência de `MOCK_CONTATOS`
