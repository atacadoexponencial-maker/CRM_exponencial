# 07: Preencher formulário de cadastro de empresa

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Implementar o formulário de cadastro com os campos: nome da empresa, nome do responsável, e-mail, senha e confirmação de senha, com validação de campos obrigatórios e feedback visual de erro.

## Cenários

### Happy Path
1. Usuário preenche todos os campos corretamente
2. Senha e confirmação de senha são iguais
3. E-mail tem formato válido
4. Formulário é submetido sem erros visíveis

### Edge Cases
- Senha com menos de 8 caracteres → exibe mensagem "Senha deve ter pelo menos 8 caracteres"
- E-mail sem formato válido → exibe mensagem "E-mail inválido"
- Submissão com campos em branco → todos os campos obrigatórios exibem mensagem de erro individualmente

### Cenário de Erro
- Campo obrigatório vazio após tentativa de submit → borda vermelha no Input (via `aria-invalid`) e mensagem de erro abaixo do campo

## Banco de Dados

Não aplicável — esta issue é apenas frontend (validação de formulário). A submissão ao Supabase é escopo de outra issue.

## Arquivos

- **Modificar:** `src/app/cadastro/page.tsx` — converter para Client Component, adicionar React Hook Form + Zod, exibir mensagens de erro abaixo de cada campo

## Dependências Externas

- `react-hook-form` (^7.73.1) — já instalado, gerenciamento de estado e submissão do formulário
- `zod` (^4.3.6) — já instalado, schema de validação
- `@hookform/resolvers` (^5.2.2) — já instalado, integração entre RHF e Zod

## Checklist

- [x] Adicionar `"use client"` no topo de `src/app/cadastro/page.tsx`
- [x] Criar schema Zod com validações: nome da empresa (obrigatório), nome do responsável (obrigatório), e-mail (obrigatório, formato válido), senha (obrigatório, mínimo 8 chars), confirmação de senha (obrigatório, deve coincidir com senha)
- [x] Conectar `useForm` com `zodResolver` ao schema
- [x] Adicionar `register` e `aria-invalid` em cada `<Input>`
- [x] Exibir mensagem de erro (`<p>`) abaixo de cada campo quando houver erro
- [x] Conectar `handleSubmit` no `<form onSubmit>`
