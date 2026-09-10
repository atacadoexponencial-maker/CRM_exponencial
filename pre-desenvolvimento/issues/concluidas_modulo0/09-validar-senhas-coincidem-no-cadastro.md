# 09: Validar se senhas coincidem no cadastro

**Tipo:** Implementação
**Página:** Cadastro de Empresa

## Descrição

Ao submeter o formulário, o sistema deve verificar se senha e confirmação de senha são idênticas e exibir mensagem de erro caso não sejam.

## Cenários

### Happy Path
1. Usuário preenche todos os campos do formulário
2. Os campos "Senha" e "Confirmação de senha" têm o mesmo valor
3. Formulário passa pela validação do schema sem erro no campo `confirmarSenha`
4. Fluxo de submissão continua normalmente

### Edge Cases
- Senha com exatamente 8 caracteres (mínimo) idêntica à confirmação → válido
- Confirmação digitada primeiro e senha depois → ao submeter, o schema compara os valores finais de ambos os campos
- Senha com espaços no início/fim → a comparação é literal (sem trim), ambas devem ser exatamente iguais

### Cenário de Erro
1. Usuário preenche "Senha" e "Confirmação de senha" com valores diferentes
2. Ao submeter, o `.refine()` do schema Zod detecta a divergência
3. O erro é exibido abaixo do campo "Confirmação de senha" com a mensagem: **"As senhas não coincidem"**
4. O formulário não prossegue

## Banco de Dados

Não aplicável — validação puramente no cliente.

## Arquivos

- **Modificar:** `src/app/cadastro/page.tsx` — adicionar `.refine()` no schema Zod para comparar `senha` e `confirmarSenha`
- **Modificar:** `src/test/cadastro.test.ts` — substituir o `it.todo` pelo teste real de senhas diferentes

## Checklist

- [x] Adicionar `.refine()` ao `schema` em `src/app/cadastro/page.tsx` comparando `data.senha === data.confirmarSenha`, com mensagem "As senhas não coincidem" apontando para o path `["confirmarSenha"]`
- [x] Substituir `it.todo` em `src/test/cadastro.test.ts` pelo teste real que verifica a rejeição quando as senhas divergem
