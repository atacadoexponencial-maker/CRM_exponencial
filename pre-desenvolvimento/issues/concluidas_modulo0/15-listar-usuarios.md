# 15: Listar usuários da empresa

**Tipo:** Implementação
**Página:** Gestão de Usuários

## Descrição

Exibir a lista de todos os usuários do workspace com nome, e-mail, papel, times e status (ativo/inativo). A lista deve ser visível apenas para o Admin.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/usuarios` — a página busca os profiles do workspace via SSR, busca os e-mails via admin client e exibe a lista completa com todas as colunas preenchidas.
2. A lista mostra nome, e-mail, papel (badge), times (separados por vírgula) e status (Ativo/Inativo).
3. Isolamento multi-tenant: Admin da Empresa A vê apenas usuários da Empresa A.

### Edge Cases
- Workspace sem usuários além do próprio admin: tabela exibe apenas o admin.
- Usuário sem times: coluna Times exibe "—".

### Cenário de Erro
- Usuário não-admin acessa a rota: redireciona para `/perfil`.
- Falha ao buscar dados: a página renderiza sem travar (lista vazia).

## Banco de Dados

Sem mudanças de schema. E-mail é recuperado de `auth.users` via admin client e mesclado com os dados de `profiles`.

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/usuarios/actions.ts` — adicionar função `listarUsuarios()` que: (1) verifica se o caller é admin, (2) busca profiles+times do workspace, (3) busca e-mails via `adminClient.auth.admin.listUsers()`, (4) retorna lista mesclada
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — substituir queries diretas por `listarUsuarios()`, exibir e-mail real, redirecionar para `/perfil` se usuário não for admin

## Dependências Externas

Nenhuma nova.

## Checklist

- [x] Adicionar `listarUsuarios()` em `actions.ts` com busca de e-mails via admin client
- [x] Atualizar `page.tsx` para usar `listarUsuarios()` e exibir e-mail real
- [x] Adicionar guard de admin em `page.tsx`: redirecionar para `/perfil` se papel ≠ admin
