# 06: Protótipo — Perfil do Usuário

**Tipo:** Protótipo
**Página:** Perfil do Usuário

## Descrição

Criar o layout da página de perfil do usuário: formulário com nome e e-mail (somente leitura), seção de alteração de senha e botão de logout.

## Cenários

### Happy Path
1. Usuário autenticado acessa `/perfil`
2. Vê seção "Dados do perfil" com campo Nome (editável) e campo E-mail (somente leitura)
3. Vê botão "Salvar" para os dados do perfil
4. Vê seção "Segurança" com campos: Senha atual, Nova senha, Confirmar nova senha
5. Vê botão "Alterar senha" na seção de segurança
6. Vê botão "Sair" (logout) separado das outras ações

### Edge Cases
- Campo E-mail visualmente indicado como somente leitura (atributo `disabled` ou `readOnly` + estilo opaco)
- Campos de senha com `type="password"`
- Botão "Sair" com variante destrutiva ou secundária para diferenciar das ações de salvar

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem validação ou submissão real

## Banco de Dados

Não aplicável — issue de protótipo (dados mockados).

## Arquivos

- **Criar:** `src/app/(auth)/perfil/page.tsx` — Página de perfil do usuário com formulário estático e dados mockados

> `src/app/(auth)/layout.tsx` já criado na issue 03.
> `<Input>` já disponível em `src/components/ui/input.tsx` (instalado na issue 01).
> `<Label>` já disponível em `src/components/ui/label.tsx` (instalado na issue 01).
> `<Button>` já existe em `src/components/ui/button.tsx`.

## Dependências Externas

Nenhuma — todos os componentes necessários já estarão disponíveis após as issues 01 e 03.

## Checklist

- [x] Criar `src/app/(auth)/perfil/page.tsx` com dados mockados
- [x] Seção "Dados do perfil": campo Nome (editável) + campo E-mail (`readOnly`, visualmente desabilitado) + botão "Salvar"
- [x] Seção "Segurança": campos Senha atual, Nova senha, Confirmar nova senha + botão "Alterar senha"
- [x] Usar `<Input>` de `src/components/ui/input.tsx` e `<Label>` de `src/components/ui/label.tsx`
- [x] Usar `<Button>` de `src/components/ui/button.tsx` em todas as ações
- [x] Botão "Sair" com variante `variant="outline"` ou `variant="destructive"` para distinção visual
- [x] As duas seções separadas visualmente (ex. com título `<h2>` e espaçamento entre elas)
