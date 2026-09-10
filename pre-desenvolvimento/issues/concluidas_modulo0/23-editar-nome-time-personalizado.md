# 23: Editar nome de time personalizado

**Tipo:** Implementação
**Página:** Gestão de Times

## Descrição

Admin edita o nome de um time personalizado. O sistema deve impedir a edição do nome dos times padrão Expansão e Retenção.

## Cenários

### Happy Path
1. Admin clica no ícone `⋯` de um time personalizado
2. Seleciona "Editar nome" no dropdown
3. Um dialog abre com o campo "Nome" pré-preenchido com o nome atual
4. Admin altera o nome e clica em "Salvar"
5. A action `editarNomeTime` valida e faz UPDATE na tabela `teams`
6. O dialog fecha e a lista é atualizada com o novo nome

### Edge Cases
- Nome com apenas espaços → rejeitado (`.trim().min(1)`)
- Nome igual ao atual → permitido (UPDATE acontece sem erro)
- Nome duplicado de outro time no mesmo workspace → retorna erro "Já existe um time com esse nome"
- Admin fecha o dialog sem salvar → nome original é restaurado ao reabrir

### Cenário de Erro
- Time é padrão (`is_default = true`) → action retorna `{ erro: "Não é possível editar times padrão" }` (guarda no backend, item "Editar nome" já oculto no frontend pelo `!time.isDefault`)
- Erro de banco → exibe "Não foi possível salvar. Tente novamente."
- Usuário não é admin → action retorna `{ erro: "Sem permissão" }`

## Banco de Dados (se aplicável)

- Tabela: `teams`
  - `name` (text) — coluna atualizada pelo UPDATE
  - Condição do UPDATE: `id = timeId AND workspace_id = workspaceId AND is_default = false`

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/times/acoes-time.tsx` — componente client que encapsula o DropdownMenu (⋯) + Dialog "Editar nome". Mesmo padrão de `acoes-usuario.tsx`. Item "Excluir" presente mas sem handler (issue 24).
- **Modificar:** `src/app/(auth)/configuracoes/times/actions.ts` — adicionar `editarNomeTime(timeId: string, novoNome: string): Promise<{ erro?: string }>`
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — substituir o bloco `{!time.isDefault && <DropdownMenu>…</DropdownMenu>}` por `{!time.isDefault && <AcoesTime timeId={time.id} nomeAtual={time.name} />}` e remover imports não usados (`DropdownMenu*`, `MoreHorizontal`, `Button`)

## Checklist

- [x] Adicionar action `editarNomeTime` em `actions.ts` com verificação de role, workspace, `is_default = false` e nome duplicado
- [x] Criar `acoes-time.tsx` com DropdownMenu + Dialog "Editar nome" pré-preenchido, seguindo padrão de `acoes-usuario.tsx`
- [x] Atualizar `page.tsx` para usar `<AcoesTime>` e remover imports não mais usados
