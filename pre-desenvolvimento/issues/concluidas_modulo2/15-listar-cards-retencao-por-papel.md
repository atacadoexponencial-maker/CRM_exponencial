# 15: Listar cards do Funil de Retenção por papel

**Tipo:** Implementação
**Página:** Funil de Retenção

## Descrição

Conectar o Funil de Retenção ao Supabase para que Admin e Gerente vejam todos os cards do workspace, enquanto Atendente vê apenas os cards atribuídos a ele. Isolamento multi-tenant obrigatório: usuário de outro workspace não pode ver cards alheios.

## Cenários

### Happy Path
1. Admin ou Gerente acessa `/pipeline/retencao`
2. `page.tsx` chama `listarCardsRetencao()` com o cliente autenticado
3. A query no Supabase retorna todos os cards do workspace via RLS
4. O componente `FunilRetencao` exibe todos os cards organizados por etapa

Para Atendente:
1. Atendente acessa `/pipeline/retencao`
2. `listarCardsRetencao()` verifica autenticação e busca o `workspace_id` do usuário
3. A query retorna apenas os cards onde `atendente_id = auth.uid()` (garantido pela policy RLS)
4. O componente exibe somente os cards do atendente

### Edge Cases
- Atendente sem nenhum card atribuído → lista vazia exibida (kanban com colunas vazias)
- Card sem atendente (`atendente_id IS NULL`) → invisível para Atendentes, visível para Admin/Gerente

### Cenário de Erro
- Usuário não autenticado → `listarCardsRetencao()` retorna `[]` antes de fazer query no banco
- Erro na query Supabase → lança `Error("Erro ao carregar cards do funil de retenção")`

## Banco de Dados

Nenhuma migration necessária. A policy RLS já existente em `pipeline_cards` já implementa o filtro por papel:

```sql
create policy "Cards visíveis por papel"
  on pipeline_cards for select
  using (
    workspace_id = (select workspace_id from profiles where id = auth.uid())
    and (
      (select role from profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
  );
```

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — adicionar verificação de autenticação em `listarCardsRetencao()` seguindo o mesmo padrão de `listarAtendentes()`: buscar `user` e retornar `[]` se não autenticado

## Checklist

- [x] Adicionar verificação de autenticação em `listarCardsRetencao()` (retornar `[]` se `!user`)
