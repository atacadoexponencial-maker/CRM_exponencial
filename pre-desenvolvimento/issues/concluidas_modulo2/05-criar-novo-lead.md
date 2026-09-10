# 05: Criar novo lead no Funil de Expansão

**Tipo:** Implementação
**Página:** Funil de Expansão

## Descrição

Implementar o fluxo de criação de novo card no Funil de Expansão: Admin ou Gerente clica em "Novo lead", informa o contato (por número de WhatsApp ou nome já cadastrado) e o sistema cria o card na etapa "Lead". Atendente não tem acesso a essa ação.

---

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/pipeline` — botão "Novo lead" visível
2. Clica em "Novo lead" — modal abre com campos de número de WhatsApp (obrigatório) e nome do contato (opcional)
3. Preenche o número, opcionalmente o nome, e clica em "Criar lead"
4. Server Action verifica papel (admin/gerente), faz upsert do contato e insere card na etapa "lead"
5. Modal fecha, página recarrega com o novo card visível na coluna "Lead"

### Edge Cases
- Contato com o mesmo número já existe no workspace → upsert reutiliza o contato existente (sem criar duplicata)
- Nome em branco → contato criado sem nome (`name = null`); card exibe "Sem nome" no lugar do contato
- Número com ou sem máscara (ex: `+55 11 99999-9999`) → aceito como texto puro; normalização fica fora deste escopo

### Cenário de Erro
- Atendente tenta chamar a action diretamente → Server Action retorna erro de permissão; RLS bloqueia INSERT
- Supabase indisponível → modal exibe mensagem de erro genérica, não fecha
- Número vazio → validação Zod no formulário impede submit

---

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards` — adicionar política INSERT
  - Regra: usuário deve ser do mesmo workspace E ter papel admin ou gerente

- Tabela: `contacts` — adicionar política INSERT
  - Regra: usuário deve ser do mesmo workspace

---

## Arquivos

- **Criar:** `supabase/migrations/20260526000001_pipeline_cards_insert_policy.sql` — políticas INSERT para `pipeline_cards` (admin/gerente do workspace) e `contacts` (membros do workspace)
- **Criar:** `src/app/(auth)/pipeline/components/modal-novo-lead.tsx` — modal com formulário (react-hook-form + zod): campo obrigatório de telefone e campo opcional de nome; chama `criarNovoLead()` e fecha ao sucesso
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `criarNovoLead(telefone, nome)`: verifica papel do usuário autenticado, faz upsert em `contacts`, insere em `pipeline_cards` com etapa `"lead"`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — receber prop `papel: string`, ocultar botão "Novo lead" se papel for `"atendente"`, controlar estado `modalAberto` e chamar `router.refresh()` após criação bem-sucedida
- **Modificar:** `src/app/(auth)/pipeline/page.tsx` — buscar papel do usuário logado via Supabase e passar como prop `papel` para `FunilExpansao`

> Reutilizar: `Button` de `@/components/ui/button`; `Input` e `Label` de `@/components/ui/input` e `@/components/ui/label`; `createClient` de `@/integrations/supabase/server`; padrão react-hook-form + zod do `src/app/cadastro/page.tsx`.

---

## Checklist

- [x] Criar `supabase/migrations/20260526000001_pipeline_cards_insert_policy.sql` com: política INSERT em `pipeline_cards` (workspace_id do card = workspace_id do usuário E papel in admin/gerente) e política INSERT em `contacts` (workspace_id = workspace_id do usuário)
- [x] Adicionar `criarNovoLead(telefone: string, nome: string | null)` em `src/app/(auth)/pipeline/actions.ts`: busca perfil do usuário, valida papel, upsert em contacts por (workspace_id, phone_number), insere em pipeline_cards com etapa "lead"
- [x] Criar `src/app/(auth)/pipeline/components/modal-novo-lead.tsx`: modal com overlay, formulário react-hook-form + zod (telefone obrigatório, nome opcional), botão "Criar lead" com estado de carregamento, mensagem de erro em caso de falha, fecha ao sucesso via callback `onSucesso`
- [x] Modificar `funil-expansao.tsx`: adicionar prop `papel: string`; ocultar `<Button>` "Novo lead" quando `papel === "atendente"`; adicionar estado `modalAberto`; passar callback `onSucesso={() => { setModalAberto(false); router.refresh() }}` para `ModalNovoLead`; importar `useRouter` de `next/navigation`
- [x] Modificar `page.tsx`: buscar `profile` do usuário logado com `supabase.from("profiles").select("role").eq("id", user.id).single()` e passar `papel={profile.role}` para `<FunilExpansao>`
