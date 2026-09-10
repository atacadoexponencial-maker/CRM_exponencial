# 09: Validar Número Duplicado na Criação

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Sistema rejeita a criação de um contato cujo número de WhatsApp já existe no workspace, exibindo mensagem de erro clara antes de salvar.

> **Nota:** A issue 08 já captura o erro de constraint (`23505`) depois do INSERT. Esta issue adiciona validação **proativa** no onBlur do campo telefone: ao sair do campo, o sistema verifica se o número já existe e exibe erro inline diretamente no campo — antes de o usuário tentar salvar.

## Cenários

### Happy Path
1. Usuário preenche um número novo e sai do campo (onBlur) — nenhuma mensagem de erro aparece
2. Usuário clica em "Salvar" com número novo — contato criado normalmente

### Edge Cases
- Número já existe no workspace: ao sair do campo telefone, aparece erro inline "Número já cadastrado neste workspace"
- Usuário corrigi o número para um novo: erro some ao redigitar (onChange limpa o erro)
- Campo telefone vazio ao sair: sem verificação (o schema Zod já cuida do obrigatório)
- Verificação não bloqueia o submit — o erro de duplicate key do banco (`23505`) em `criarContato()` continua como fallback

### Cenário de Erro
- Falha na consulta ao banco: erro silencioso — não exibe mensagem, deixa o submit tentar normalmente

## Banco de Dados

- Tabela: `contacts`
  - `phone_number` (text) + `workspace_id` (uuid) — constraint UNIQUE já existente; apenas consulta SELECT

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/actions.ts` — adicionar `verificarNumeroDuplicado(telefone: string)` que faz SELECT count no workspace do usuário logado
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — adicionar onBlur no campo telefone que chama `verificarNumeroDuplicado` e exibe erro inline; onChange limpa o erro

## Checklist

- [x] Adicionar `verificarNumeroDuplicado(telefone)` em `actions.ts`: retorna `true` se já existe no workspace, `false` caso contrário
- [x] Adicionar estado `erroTelefone` em `novo-contato-dialog.tsx` e exibi-lo sob o campo telefone
- [x] Adicionar handler `onBlur` no campo telefone que chama `verificarNumeroDuplicado` e seta `erroTelefone`
- [x] Adicionar handler `onChange` no campo telefone que limpa `erroTelefone` ao redigitar
