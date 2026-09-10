# 24: Excluir time personalizado

**Tipo:** Implementação
**Página:** Gestão de Times

## Descrição

Admin exclui um time personalizado após confirmação. O sistema remove os usuários do time sem excluí-los e impede a exclusão dos times padrão Expansão e Retenção.

## Cenários

### Happy Path
1. Admin clica no ícone `⋯` de um time personalizado
2. Seleciona "Excluir" no dropdown
3. Um dialog de confirmação abre exibindo o nome do time e aviso que os membros não serão excluídos
4. Admin clica em "Excluir" para confirmar
5. A action `excluirTime` verifica permissão e faz DELETE na tabela `teams`
6. As entradas em `user_teams` são removidas automaticamente via `ON DELETE CASCADE`
7. O dialog fecha e o time desaparece da lista

### Edge Cases
- Time sem membros → exclusão funciona normalmente
- Time com membros → membros são desassociados via cascade, não excluídos
- Admin fecha o dialog de confirmação sem confirmar → nada acontece

### Cenário de Erro
- Time é padrão (`is_default = true`) → action retorna `{ erro: "Não é possível excluir times padrão" }` (item "Excluir" já oculto no frontend pelo `!time.isDefault`)
- Erro de banco → exibe "Não foi possível excluir o time. Tente novamente."
- Usuário não é admin → action retorna `{ erro: "Sem permissão" }`

## Banco de Dados (se aplicável)

- Tabela: `teams`
  - DELETE WHERE `id = timeId AND workspace_id = workspaceId AND is_default = false`
- Tabela: `user_teams`
  - Entradas removidas automaticamente via `ON DELETE CASCADE` (já configurado na migration)

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/times/actions.ts` — adicionar `excluirTime(timeId: string): Promise<{ erro?: string }>`
- **Modificar:** `src/app/(auth)/configuracoes/times/acoes-time.tsx` — adicionar estado e dialog de confirmação para "Excluir", e wiring do `DropdownMenuItem` existente

## Checklist

- [x] Adicionar action `excluirTime` em `actions.ts` com verificação de role, workspace e `is_default = false`
- [x] Adicionar dialog de confirmação em `acoes-time.tsx` e wiring do item "Excluir" no dropdown
