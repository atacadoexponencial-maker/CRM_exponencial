# 14: Registrar Compra

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Admin ou Gerente clica em "Registrar compra", informa data e valor; sistema valida que o valor não é negativo ou zero, salva o registro e recalcula o ticket médio exibido na seção de histórico de compras.

## Cenários

### Happy Path
1. Admin ou Gerente abre o perfil do contato
2. Clica em "Registrar compra" na seção Histórico de compras
3. Um dialog abre com campos: Data e Valor
4. Usuário preenche data válida e valor positivo, clica em "Salvar"
5. Compra é salva no banco; dialog fecha; página recarrega
6. Nova compra aparece na tabela e ticket médio é recalculado automaticamente

### Edge Cases
- Valor zero: validação impede submissão ("Valor deve ser maior que zero")
- Valor negativo: validação impede submissão ("Valor deve ser maior que zero")
- Data não preenchida: validação impede submissão ("Data é obrigatória")
- Cancelar: dialog fecha sem salvar, dados descartados
- Atendente não vê o botão (já ocultado pela prop `papel`)

### Cenário de Erro
- Se a action falhar: exibe mensagem de erro inline no dialog; dialog permanece aberto

## Banco de Dados

- Tabela: `contact_purchases`
  - `id` (uuid, PK) — identificador da compra
  - `contact_id` (uuid, FK → contacts) — contato vinculado
  - `workspace_id` (uuid, FK → workspaces) — workspace para RLS
  - `data` (date, not null) — data da compra
  - `valor` (numeric(12,2), not null) — valor da compra
  - `created_at` (timestamptz) — data de criação

## Arquivos

- **Criar:** `supabase/migrations/20260603000005_create_contact_purchases.sql` — cria tabela `contact_purchases` com RLS
- **Criar:** `src/app/(auth)/contatos/[id]/components/registrar-compra-dialog.tsx` — dialog com form (data + valor), valida, chama action, fecha e faz refresh
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adiciona `registrarCompra` action; atualiza `buscarDadosContato` para buscar compras da tabela e mapeá-las
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — substitui o `<Button>` placeholder pelo `<RegistrarCompraDialog>`

## Checklist

- [x] Migration: criar tabela `contact_purchases` com RLS (membros do workspace veem; admin/gerente inserem)
- [x] Action `registrarCompra`: valida valor > 0, verifica workspace, insere na tabela
- [x] `buscarDadosContato`: buscar `contact_purchases` do contato, formatar data como "dd/mm/aaaa", mapear para `Compra[]`
- [x] `registrar-compra-dialog.tsx`: dialog com campos data (input date) e valor (input number), validação Zod, erro inline, chama `registrarCompra`, fecha e faz `router.refresh()`
- [x] `perfil-contato.tsx`: substituir `<Button>` placeholder pelo `<RegistrarCompraDialog contactId={contato.id} />`
