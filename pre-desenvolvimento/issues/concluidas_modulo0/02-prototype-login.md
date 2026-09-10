# 02: Protótipo — Login

**Tipo:** Protótipo
**Página:** Login

## Descrição

Criar o layout da página pública de login com formulário de e-mail e senha, botão de entrar e link para cadastro de nova empresa.

## Cenários

### Happy Path
1. Usuário acessa `/login`
2. Vê formulário com os campos: e-mail e senha
3. Vê botão "Entrar" ao final do formulário
4. Vê link "Criar conta" que navega para `/cadastro`

### Edge Cases
- Campo de senha exibe texto oculto por padrão (`type="password"`)
- Layout responsivo: funciona bem em mobile e desktop

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem validação ou submissão real

## Banco de Dados

Não aplicável — issue de protótipo (layout estático).

## Arquivos

- **Criar:** `src/app/login/page.tsx` — Página pública de login com formulário estático

> A rota `/login` já é pública no `src/middleware.ts` — nenhuma modificação no middleware necessária.
> `<Input>` e `<Label>` instalados na issue 01: `src/components/ui/input.tsx` e `src/components/ui/label.tsx`.
> `<Button>` já existe em `src/components/ui/button.tsx`.

## Dependências Externas

Nenhuma — todos os componentes necessários já estarão disponíveis após a issue 01.

## Checklist

- [x] Criar `src/app/login/page.tsx` como Server Component (sem `'use client'`)
- [x] Formulário com campos: E-mail, Senha
- [x] Usar `<Input>` de `src/components/ui/input.tsx` e `<Label>` de `src/components/ui/label.tsx`
- [x] Usar `<Button>` de `src/components/ui/button.tsx` para o botão "Entrar"
- [x] Link `<a href="/cadastro">` para a página de cadastro
- [x] Layout centralizado verticalmente com largura máxima de formulário (`max-w-md mx-auto`)
