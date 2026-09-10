# 06: Listar Conversas por Papel

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar a listagem de conversas respeitando o papel do usuário: Atendente vê apenas conversas do seu time ou atribuídas a ele; Gerente e Admin veem todas as conversas do workspace.

## Cenários

### Happy Path — Admin ou Gerente
1. Usuário com papel `admin` ou `gerente` acessa `/chat`
2. A visibilidade padrão é "Todas" — vê todas as 20 conversas do mock
3. Pode trocar para "Minhas" (conversas atribuídas ao seu nome) ou "Meu time"
4. Todos os 3 botões de visibilidade estão habilitados

### Happy Path — Atendente
1. Usuário com papel `atendente` acessa `/chat`
2. A visibilidade padrão é "Minhas" — vê apenas conversas onde `atribuidaA === nome do usuário`
3. Pode trocar para "Meu time" (exibe todas, pois mock não tem campo de time por conversa)
4. O botão "Todas" NÃO é exibido para atendentes

### Edge Cases
- Atendente sem nenhuma conversa atribuída: lista exibe "Nenhuma conversa encontrada"
- Usuário não autenticado: redirecionado para `/login` antes de chegar ao chat

### Cenário de Erro
- Erro ao buscar perfil do Supabase: `redirect("/login")`

## Banco de Dados (se aplicável)

- Tabela: `profiles`
  - `role` (text) — papel do usuário: `admin`, `gerente`, `atendente`
  - `name` (text) — nome exibido do usuário (usado para comparar com `atribuidaA` nas conversas mock)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/page.tsx` — converter para async Server Component; buscar `role` e `name` do usuário autenticado em `profiles`; redirect para `/login` se não autenticado; passar `papel` e `nomeUsuario` para `ChatLayout`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — adicionar props `papel: string` e `nomeUsuario: string`; repassar para `FiltrosCaixa`
- **Modificar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — aceitar `papel` e `nomeUsuario`; habilitar botões de visibilidade; ocultar "Todas" para atendente; implementar filtro: "minhas" mostra `atribuidaA === nomeUsuario`, "meu_time" mostra todas (limitação do mock), "todas" mostra tudo

> As conversas ainda são mock — apenas o papel e o nome do usuário vêm do Supabase real.

## Dependências Externas

Nenhuma nova. Reutilizar:
- `createClient` de `@/integrations/supabase/server` (já usado em outras pages)
- `redirect` de `next/navigation` (já usado em outras pages)

## Checklist

- [x] `chat/page.tsx`: converter para `async` Server Component; importar `createClient` e `redirect`; buscar `user` + `perfil (role, name)` de `profiles`; redirect para `/login` se sem sessão ou perfil; passar `papel` e `nomeUsuario` para `ChatLayout`
- [x] `chat-layout.tsx`: adicionar `papel: string` e `nomeUsuario: string` às props de `ChatLayoutProps`; repassar ambas para `<FiltrosCaixa>`
- [x] `filtros-caixa.tsx`: adicionar `papel` e `nomeUsuario` às props; inicializar `visibilidade` como `"todas"` para admin/gerente e `"minhas"` para atendente; ocultar botão "Todas" se papel for `"atendente"`; habilitar os 3 botões (remover `disabled`); aplicar filtro de visibilidade na lista
