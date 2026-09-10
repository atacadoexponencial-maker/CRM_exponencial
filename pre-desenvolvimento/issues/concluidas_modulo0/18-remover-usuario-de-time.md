# 18: Remover usuário de um time

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Admin remove um usuário de um time a partir da tela de gestão de usuários.

## Cenários

### Happy Path
1. Admin abre o menu "Ações" de um usuário na tabela de gestão de usuários.
2. Admin clica em "Gerenciar times".
3. Dialog abre com checkboxes; os times atuais do usuário estão marcados.
4. Admin desmarca o time desejado e clica em "Salvar".
5. A action `gerenciarTimes` deleta as associações antigas e insere apenas as que sobraram.
6. Dialog fecha, a página recarrega e a coluna "Times" reflete a remoção.

### Edge Cases
- Admin desmarca todos os times: usuário fica sem times (colunas "Times" exibe "—").

### Cenário de Erro
- Falha no banco: mensagem inline "Não foi possível salvar os times. Tente novamente."

## Nota de Implementação

> Esta funcionalidade foi implementada integralmente como parte da **issue #17** (Adicionar usuário a um time).
>
> A action `gerenciarTimes` em `src/app/(auth)/configuracoes/usuarios/actions.ts` faz substituição completa: deleta todas as associações do usuário nos times do workspace e insere apenas as selecionadas. Desmarcar um time e salvar já remove a associação.
>
> Nenhum arquivo precisa ser criado ou modificado.

## Arquivos

> Nenhum arquivo a modificar — funcionalidade já coberta pela issue #17.

## Checklist

- [x] Remover usuário de um time já funciona via dialog "Gerenciar times" (issue #17)
- [x] `gerenciarTimes` cobre remoção com delete + insert replacement
- [x] Testes de remoção já implementados em `src/test/usuarios.integration.test.ts` (issue #17)
