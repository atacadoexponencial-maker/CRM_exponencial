# 22: Criar time personalizado

**Tipo:** Implementação
**Página:** Gestão de Times

## Descrição

Admin cria um novo time informando apenas o nome. O time é criado como personalizado e aparece na lista junto aos times padrão.

## Cenários

### Happy Path
1. Admin clica em "Criar time" na página de Times
2. Um dialog abre com um campo de nome
3. Admin digita o nome do time e clica em "Salvar"
4. A action `criarTime` valida e insere na tabela `teams` com `is_default: false`
5. O dialog fecha, a lista é atualizada e o novo time aparece com badge "Personalizado"

### Edge Cases
- Nome com apenas espaços → deve ser rejeitado (validação Zod com `.trim().min(1)`)
- Nome duplicado dentro do mesmo workspace → retorna erro "Já existe um time com esse nome"
- Admin fecha o dialog sem salvar → formulário é resetado ao reabrir

### Cenário de Erro
- Erro de banco de dados → exibe mensagem "Não foi possível criar o time. Tente novamente."
- Usuário não é admin → action retorna `{ erro: "Sem permissão" }`, mensagem exibida no dialog

## Banco de Dados (se aplicável)

- Tabela: `teams`
  - `workspace_id` (uuid) — preenchido automaticamente via perfil do usuário logado
  - `name` (text) — nome digitado pelo admin
  - `is_default` (boolean) — sempre `false` para times personalizados

> RLS já existente: "Admins gerenciam times do próprio workspace" cobre INSERT.

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/times/criar-time-dialog.tsx` — componente client com Dialog + formulário React Hook Form + Zod, mesmo padrão de `adicionar-usuario-dialog.tsx`
- **Modificar:** `src/app/(auth)/configuracoes/times/actions.ts` — adicionar action `criarTime(nome: string): Promise<{ erro?: string }>`
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — substituir `<Button>Criar time</Button>` estático pelo `<CriarTimeDialog />`

## Checklist

- [x] Adicionar action `criarTime` em `actions.ts` com validação de role, workspace_id e nome duplicado
- [x] Criar `criar-time-dialog.tsx` com Dialog + campo "Nome" + validação Zod + tratamento de erro
- [x] Atualizar `page.tsx` para importar e renderizar `<CriarTimeDialog />` no lugar do botão estático
