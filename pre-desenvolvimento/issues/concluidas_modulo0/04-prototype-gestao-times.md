# 04: Protótipo — Gestão de Times

**Tipo:** Protótipo
**Página:** Gestão de Times

## Descrição

Criar o layout da área de gestão de times: lista de times com nome, quantidade de membros e tipo (padrão/personalizado), lista de membros por time, botão de criar time e menu de ações.

## Cenários

### Happy Path
1. Usuário autenticado acessa `/configuracoes/times`
2. Vê título da página e botão "Criar time"
3. Vê lista de times com: nome, badge de tipo (Padrão / Personalizado), quantidade de membros e menu de ações
4. Dados mockados incluem os times padrão "Expansão" e "Retenção" e pelo menos 1 time personalizado
5. Times padrão têm menu de ações desabilitado/sem opção de editar ou excluir
6. Cada time exibe a lista de seus membros logo abaixo (nome e avatar/iniciais)
7. Menu de ações em times personalizados: Editar nome, Excluir

### Edge Cases
- Badge de tipo com cor diferente: ex. azul para Padrão, roxo para Personalizado
- Times padrão sem opção de editar/excluir no menu

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem interação real

## Banco de Dados

Não aplicável — issue de protótipo (dados mockados).

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/times/page.tsx` — Página de gestão de times com dados mockados

> `src/app/(auth)/layout.tsx` já criado na issue 03.
> `<Badge>` já disponível em `src/components/ui/badge.tsx` (instalado na issue 03).
> `<DropdownMenu>` já disponível em `src/components/ui/dropdown-menu.tsx` (instalado na issue 03).
> `<Button>` já existe em `src/components/ui/button.tsx`.

## Dependências Externas

Nenhuma — todos os componentes necessários já estarão disponíveis após a issue 03.

## Checklist

- [x] Criar `src/app/(auth)/configuracoes/times/page.tsx` com dados mockados
- [x] Lista de times com: Nome, Badge de tipo, Quantidade de membros, Menu de ações
- [x] Dados mockados: times "Expansão" (padrão), "Retenção" (padrão) e ao menos 1 time personalizado
- [x] Usar `<Badge>` de `src/components/ui/badge.tsx` para o tipo do time
- [x] Usar `<DropdownMenu>` de `src/components/ui/dropdown-menu.tsx` para ações por time
- [x] Usar `<Button>` de `src/components/ui/button.tsx` para "Criar time"
- [x] Exibir membros de cada time abaixo do cabeçalho do time (nome + iniciais como avatar)
- [x] Times padrão sem opções de editar/excluir no menu de ações
