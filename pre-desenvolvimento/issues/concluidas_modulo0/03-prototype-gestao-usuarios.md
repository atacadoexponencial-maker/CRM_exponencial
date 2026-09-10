# 03: Protótipo — Gestão de Usuários

**Tipo:** Protótipo
**Página:** Gestão de Usuários

## Descrição

Criar o layout da área de gestão de usuários do workspace: lista de usuários com nome, e-mail, papel, times e status, botão de adicionar usuário e menu de ações por usuário.

## Cenários

### Happy Path
1. Usuário autenticado acessa `/configuracoes/usuarios`
2. Vê título da página e botão "Adicionar usuário"
3. Vê tabela com colunas: Nome, E-mail, Papel, Times, Status
4. Vê dados mockados com 2–3 usuários de exemplo
5. Vê badge colorido por status (Ativo / Inativo) e por papel (Admin / Gerente / Atendente)
6. Vê ícone de menu (3 pontos) por linha com opções: Editar papel, Gerenciar times, Desativar

### Edge Cases
- Layout responsivo — tabela com scroll horizontal em mobile
- Badge de status com cores distintas: verde para Ativo, cinza para Inativo

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem interação real

## Banco de Dados

Não aplicável — issue de protótipo (dados mockados).

## Arquivos

- **Criar:** `src/app/(auth)/layout.tsx` — Layout compartilhado das páginas protegidas (sidebar ou nav com links de configurações)
- **Criar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — Página de gestão de usuários com dados mockados
- **Criar:** `src/components/ui/badge.tsx` — Componente Badge do shadcn/ui (via `npx shadcn@latest add badge`)
- **Criar:** `src/components/ui/dropdown-menu.tsx` — Componente DropdownMenu do shadcn/ui (via `npx shadcn@latest add dropdown-menu`)

> `<Button>` já existe em `src/components/ui/button.tsx`.
> cn() já existe em `src/lib/utils.ts`.
> A tabela será implementada com HTML semântico (`<table>`) estilizado com Tailwind — sem necessidade do componente Table do shadcn para um protótipo.

## Dependências Externas

- `shadcn/ui badge` — badges coloridos para papel e status
- `shadcn/ui dropdown-menu` — menu de ações por linha da tabela

## Checklist

- [x] Instalar componentes shadcn: `npx shadcn@latest add badge dropdown-menu`
- [x] Criar `src/app/(auth)/layout.tsx` com navegação lateral ou superior com links para Usuários, Times e WhatsApp
- [x] Criar `src/app/(auth)/configuracoes/usuarios/page.tsx` com dados mockados
- [x] Tabela com colunas: Nome, E-mail, Papel, Times, Status, Ações
- [x] Usar `<Badge>` de `src/components/ui/badge.tsx` para Papel e Status
- [x] Usar `<DropdownMenu>` de `src/components/ui/dropdown-menu.tsx` para menu de ações
- [x] Usar `<Button>` de `src/components/ui/button.tsx` para "Adicionar usuário"
- [x] Mínimo 2 usuários mockados com dados variados (papéis e status diferentes)
