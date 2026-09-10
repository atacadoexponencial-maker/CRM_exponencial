# 07: Filtrar cards por atendente responsável

**Tipo:** Implementação
**Página:** Funil de Expansão e Funil de Retenção

## Descrição

Implementar o filtro de cards por atendente responsável nos dois funis. Disponível apenas para Admin e Gerente. Ao selecionar um atendente no filtro, o kanban exibe apenas os cards atribuídos a ele.

A UI do filtro (dropdown, estado `atendenteFiltro`, filtragem client-side) já existe nos dois funis desde as issues de protótipo. O que falta é: (1) substituir `ATENDENTES_MOCK` pela lista real de usuários ativos do workspace; (2) ocultar o filtro para Atendente.

---

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/pipeline` — filtro "Atendente" visível no header
2. Clica no filtro — dropdown exibe todos os usuários ativos do workspace + opções "Todos" e "Sem atendente"
3. Seleciona um atendente → kanban filtra em tempo real, exibindo apenas cards daquele atendente
4. Seleciona "Sem atendente" → exibe apenas cards sem responsável
5. Seleciona "Todos" → volta a exibir todos os cards visíveis
6. O mesmo fluxo acontece no Funil de Retenção

### Edge Cases
- Workspace com apenas um usuário (o próprio Admin) → dropdown mostra só ele e as opções padrão
- Atendente acessa a página → filtro de atendente não aparece no header

### Cenário de Erro
Não aplicável para o filtro (client-side). Erro de carregamento de atendentes → servidor lança erro, tratado pelo error boundary da página.

---

## Banco de Dados (se aplicável)

Não requer migração. Consulta existente na tabela `profiles` filtrada por `workspace_id` e `status = 'active'`.

---

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar `listarAtendentes(): Promise<string[]>` que busca `name` de todos os perfis ativos do workspace do usuário logado
- **Modificar:** `src/app/(auth)/pipeline/page.tsx` — chamar `listarAtendentes()` e passar `atendentes` para `FunilExpansao`
- **Modificar:** `src/app/(auth)/pipeline/retencao/page.tsx` — chamar `listarAtendentes()` e passar `atendentes` para `FunilRetencao`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-expansao.tsx` — remover `ATENDENTES_MOCK`; adicionar prop `atendentes: string[]`; ocultar o bloco do filtro de atendente quando `papel === "atendente"`
- **Modificar:** `src/app/(auth)/pipeline/components/funil-retencao.tsx` — mesmas alterações que `funil-expansao.tsx`

> Reutilizar: `createClient` de `@/integrations/supabase/server` (já importado nas pages). A filtragem client-side já existe e não precisa ser alterada.

---

## Checklist

- [x] Adicionar `listarAtendentes(): Promise<string[]>` em `actions.ts`: busca `name` de `profiles` com `status = 'active'` no `workspace_id` do usuário logado; retorna array de nomes
- [x] Modificar `page.tsx` (Expansão): chamar `listarAtendentes()` e passar `atendentes={atendentes}` para `<FunilExpansao>`
- [x] Modificar `retencao/page.tsx`: chamar `listarAtendentes()` e passar `atendentes={atendentes}` para `<FunilRetencao>`
- [x] Modificar `funil-expansao.tsx`: remover `ATENDENTES_MOCK`; adicionar prop `atendentes: string[]`; substituir referência ao mock pela prop; envolver o bloco do filtro de atendente em `{papel !== "atendente" && (...)}`
- [x] Modificar `funil-retencao.tsx`: mesmas 4 alterações que `funil-expansao.tsx`
