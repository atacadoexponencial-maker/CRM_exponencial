# 14: Transição automática para Retenção ao marcar Primeira Compra

**Tipo:** Implementação
**Página:** Funil de Expansão

## Descrição

Ao mover um card para a etapa "Primeira Compra" no Funil de Expansão, o sistema cria automaticamente um card correspondente no Funil de Retenção na etapa "Em Onboarding", vinculado ao mesmo contato. O card original permanece visível em "Primeira Compra" no Funil de Expansão como registro histórico.

## Cenários

### Happy Path
1. Admin, Gerente ou Atendente move um card de Expansão para "Primeira Compra" (via drag-and-drop no kanban ou dropdown no `PainelCard`)
2. `moverCard` atualiza o card de Expansão para `etapa: "primeira_compra"`
3. Automaticamente, um novo card é criado em `pipeline_cards` com `funil: "retencao"`, `etapa: "em_onboarding"`, mesmo `contact_id` e `workspace_id`
4. O card original permanece em "Primeira Compra" no Funil de Expansão
5. O novo card aparece em "Em Onboarding" no Funil de Retenção

### Edge Cases
- Contato já possui card ativo em Retenção: não criar duplicata (checar se já existe `pipeline_cards` com `funil="retencao"` e `contact_id` do mesmo contato e `workspace_id`)
- Move para outra etapa que não "primeira_compra": nenhuma ação extra

### Cenário de Erro
- Falha ao criar card de Retenção: não reverter o move do card de Expansão (o move já ocorreu, logar silenciosamente — mesmo padrão do `moverCard` atual)

## Banco de Dados (se aplicável)

- Tabela: `pipeline_cards`
  - `funil` (text) — `"retencao"` para o novo card criado
  - `etapa` (text) — `"em_onboarding"` para o novo card
  - `contact_id` (uuid) — mesmo do card de Expansão
  - `workspace_id` (uuid) — mesmo do card de Expansão

## Arquivos

- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — em `moverCard`, expandir o `select` para incluir `contact_id` e `workspace_id`; após mover para `"primeira_compra"`, checar se já existe card de retenção para o contato e, se não existir, inserir novo card `{ funil: "retencao", etapa: "em_onboarding", contact_id, workspace_id }`

## Checklist

- [x] Expandir `select` em `moverCard` para incluir `contact_id` e `workspace_id`
- [x] Após mover para `"primeira_compra"`, checar existência de card em `pipeline_cards` com `funil="retencao"` e mesmo `contact_id` + `workspace_id`
- [x] Se não existir, inserir card `{ funil: "retencao", etapa: "em_onboarding", contact_id, workspace_id }` em `pipeline_cards`
- [x] Falha na inserção do card de retenção não reverte o move (silencioso)
