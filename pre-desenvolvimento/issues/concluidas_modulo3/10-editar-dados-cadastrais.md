# 10: Editar Dados Cadastrais do Contato

**Tipo:** Implementação
**Página:** Perfil do Contato

## Descrição

Usuário edita nome, tipo, nicho, cidade e campo ICP no Perfil do Contato e salva; sistema rejeita nome vazio e exibe erro de validação.

> **Nota:** A página `/contatos/[id]` ainda usa `MOCK_PERFIS_CONTATO`. Esta issue migra os dados cadastrais (nome, tipo, nicho, cidade, icp, classificacao) para o banco real. Os campos de mock (tags, observacoes, cards, compras, timeline) ficam como arrays/strings vazios por enquanto — tratados em issues futuras.

## Cenários

### Happy Path
1. Usuário abre `/contatos/[id]` — aba Dados exibe os dados reais do contato
2. Clica em "Editar" na seção "Dados do contato" — seção exibe formulário inline com os valores atuais preenchidos
3. Altera nome, tipo, nicho, cidade e/ou ICP
4. Clica em "Salvar" — dados são salvos, formulário fecha, view atualiza com os novos valores
5. Clica em "Cancelar" — formulário fecha sem salvar, valores anteriores são restaurados

### Edge Cases
- Nome vazio: "Salvar" fica bloqueado / exibe "Nome é obrigatório"
- Contato com `icp = null`: nenhuma opção pré-selecionada
- Atendente não vê botão "Editar" (apenas admin e gerente podem editar)
- Contato não encontrado no workspace: página exibe "Contato não encontrado"

### Cenário de Erro
- Erro ao salvar: exibe mensagem "Erro ao salvar. Tente novamente." abaixo do formulário
- Contato não pertence ao workspace do usuário: RLS bloqueia o UPDATE (sem mensagem específica — retorna erro genérico)

## Banco de Dados

- Tabela: `contacts` — adicionar coluna:
  - `icp` (text, nullable) — valores: `ja_revende`, `primeira_vez`
- Nova política RLS: admin e gerente podem UPDATE em contatos do próprio workspace

## Arquivos

- **Criar:** `supabase/migrations/20260603000002_add_contact_icp_and_update_policy.sql` — coluna `icp` + política UPDATE
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adicionar `buscarDadosContato(id)` e `atualizarDadosContato(id, dados)`
- **Modificar:** `src/app/(auth)/contatos/[id]/page.tsx` — substituir `MOCK_PERFIS_CONTATO[id]` por `await buscarDadosContato(id)`
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — adicionar botão "Editar" na seção Dados e formulário inline com toggle

## Checklist

- [x] Criar migration com coluna `icp` e política UPDATE para admin/gerente
- [x] Implementar `buscarDadosContato(id)` em `actions.ts`: busca contato do workspace, retorna `ContatoPerfil` com campos mock vazios
- [x] Implementar `atualizarDadosContato(id, dados)` em `actions.ts`: atualiza `name`, `tipo`, `nicho`, `cidade`, `icp` no banco
- [x] Atualizar `page.tsx` para usar `buscarDadosContato(id)` em vez de `MOCK_PERFIS_CONTATO`
- [x] Adicionar toggle de edição na seção "Dados do contato" em `perfil-contato.tsx`: botão "Editar" → formulário inline com Zod validation → "Salvar" / "Cancelar"
