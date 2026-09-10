# 10: Criar workspace isolado da empresa

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Ao submeter o formulário com dados válidos, o sistema deve criar um workspace isolado para a empresa, garantindo que seus dados não se misturem com outras empresas.

## Cenários

### Happy Path
1. Usuário preenche o formulário de cadastro com dados válidos
2. O sistema verifica que o e-mail não está em uso
3. O sistema insere um registro na tabela `workspaces` com o nome da empresa
4. A Server Action retorna o `workspace_id` para ser usado pela issue 11
5. A execução continua (criação do Admin e times é escopo da issue 11)

### Edge Cases
- Nome da empresa com espaços no início/fim → armazenado como digitado (sem trim forçado no backend, apenas o que o formulário envia)
- Submissão simultânea duplicada → cada chamada cria um workspace independente com UUID distinto (não é problema de negócio nesta issue)

### Cenário de Erro
1. Falha de rede ou erro no Supabase ao inserir o workspace
2. A Server Action lança exceção
3. O `onSubmit` captura o erro e exibe mensagem genérica: **"Não foi possível criar o workspace. Tente novamente."** abaixo do botão
4. O formulário permanece preenchido para nova tentativa

## Banco de Dados

- Tabela: `workspaces`
  - `id` (uuid, PK, default `gen_random_uuid()`) — identificador único do workspace
  - `name` (text, NOT NULL) — nome da empresa
  - `created_at` (timestamptz, NOT NULL, default `now()`) — data de criação
  - RLS habilitado; políticas de acesso serão adicionadas na issue 11 (dependem da tabela de perfis)

## Arquivos

- **Criar:** `supabase/migrations/20260425000000_create_workspaces.sql` — DDL da tabela `workspaces` com RLS habilitado
- **Modificar:** `src/app/cadastro/actions.ts` — adicionar Server Action `criarWorkspace(nomeEmpresa: string): Promise<string>` que insere o workspace e retorna o `id`
- **Modificar:** `src/app/cadastro/page.tsx` — chamar `criarWorkspace` no `onSubmit` após a verificação de e-mail, armazenando o `workspaceId` para a issue 11
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — atualizar mocks de `verificarEmailEmUso` para `listUsers` (correção do bug pré-existente) e adicionar testes de `criarWorkspace`

## Checklist

- [x] Criar `supabase/migrations/20260425000000_create_workspaces.sql` com a tabela `workspaces` (id, name, created_at) e `alter table workspaces enable row level security`
- [x] Adicionar `criarWorkspace(nomeEmpresa: string): Promise<string>` em `src/app/cadastro/actions.ts` usando o service role client (mesmo padrão de `verificarEmailEmUso`)
- [x] Atualizar `onSubmit` em `src/app/cadastro/page.tsx` para chamar `criarWorkspace` após a verificação de e-mail e tratar erros com `setError` genérico no campo `nomeEmpresa`
