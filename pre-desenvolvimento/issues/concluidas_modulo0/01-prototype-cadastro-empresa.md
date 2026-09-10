# 01: Protótipo — Cadastro de Empresa

**Tipo:** Protótipo
**Página:** Cadastro de Empresa

## Descrição

Criar o layout da página pública de cadastro onde uma nova empresa cria seu workspace no CRM Exponencial. Inclui formulário com nome da empresa, nome do responsável, e-mail, senha e confirmação de senha.

## Cenários

### Happy Path
1. Usuário acessa `/cadastro`
2. Vê formulário com os campos: nome da empresa, nome do responsável, e-mail, senha, confirmação de senha
3. Vê botão "Criar conta" ao final do formulário
4. Vê link "Já tenho conta → Entrar" que navega para `/login`

### Edge Cases
- Layout responsivo: funciona bem em mobile e desktop
- Campos de senha exibem texto oculto por padrão

### Cenário de Erro
- Nesta issue apenas o protótipo é criado — sem validação ou submissão real

## Banco de Dados

Não aplicável — issue de protótipo (layout estático).

## Arquivos

- **Criar:** `src/app/cadastro/page.tsx` — Página pública de cadastro de empresa com formulário estático
- **Criar:** `src/components/ui/input.tsx` — Componente Input do shadcn/ui (via `npx shadcn@latest add input`)
- **Criar:** `src/components/ui/label.tsx` — Componente Label do shadcn/ui (via `npx shadcn@latest add label`)
- **Modificar:** `src/middleware.ts` — Adicionar `/cadastro` às rotas públicas (atualmente só `/` e `/login` são públicas)

> Button já existe em `src/components/ui/button.tsx` — importar diretamente.
> cn() já existe em `src/lib/utils.ts` — importar diretamente.

## Dependências Externas

- `shadcn/ui input` — campo de texto com estilo base-nova
- `shadcn/ui label` — rótulo acessível para campos de formulário

## Checklist

- [x] Instalar componentes shadcn: `npx shadcn@latest add input label`
- [x] Modificar `src/middleware.ts`: adicionar `|| request.nextUrl.pathname.startsWith('/cadastro')` à condição `isAuthRoute`
- [x] Criar `src/app/cadastro/page.tsx` como Server Component (sem `'use client'`)
- [x] Formulário com campos: Nome da Empresa, Nome do Responsável, E-mail, Senha, Confirmação de Senha
- [x] Usar `<Input>` de `src/components/ui/input.tsx` e `<Label>` de `src/components/ui/label.tsx`
- [x] Usar `<Button>` de `src/components/ui/button.tsx` para o botão de envio
- [x] Link `<a href="/login">` para página de login
- [x] Layout centralizado verticalmente com largura máxima de formulário (`max-w-md mx-auto`)
