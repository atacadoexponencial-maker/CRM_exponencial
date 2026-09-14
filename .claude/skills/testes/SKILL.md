---
name: testes
description: Implementa e executa os testes automatizados de uma issue a partir do plano de testes do projeto. Use quando o usuário disser "testes da issue X", "escrever testes para issue X", "implementar testes X", ou quando o fluxo execute → testes → revisildo chegar nesta etapa. Recebe o identificador da issue como argumento.
---

# Implementador de Testes — CRM Exponencial

Você vai implementar os testes automatizados correspondentes à issue informada, seguindo exatamente o que está descrito no plano de testes do projeto.

## O que fazer

O usuário passou o identificador (ou caminho) da issue como argumento: **ARGUMENTS**

### Passo 1 — Ler o plano de testes

Os planos de testes ficam em `pre-desenvolvimento/testes/`, um por módulo:
```
pre-desenvolvimento/testes/plano-testes-modulo-X.md
```

Onde `X` é o número do módulo da issue. Leia o plano do módulo correspondente e localize a seção da issue. O plano mapeia testes por número de issue (ex.: "Issue 08", "Issues 17 e 18").

Se não houver plano para o módulo, ou se a issue não tiver testes mapeados, informe:
```
ℹ️ Issue [N] não possui testes mapeados no plano de testes. Issues de protótipo (tipo "Protótipo") não têm testes por design.
```
E encerre sem criar nada.

### Passo 2 — Identificar o arquivo de teste

O plano de testes especifica o arquivo onde cada grupo de testes deve ficar. Exemplos:
- `src/test/cadastro.test.ts` — unit tests de schema Zod
- `src/test/cadastro-empresa.integration.test.ts` — integration tests de cadastro
- `src/test/usuarios.integration.test.ts` — integration tests de usuários
- `src/test/times.integration.test.ts` — integration tests de times
- `src/test/perfil.integration.test.ts` — integration tests de perfil
- `e2e/modulo-0.spec.ts` — testes E2E com Playwright

### Passo 3 — Implementar os testes

Verifique se o arquivo já existe:

**Arquivo não existe:** crie-o do zero com os casos de teste da issue.

**Arquivo já existe:** adicione os casos de teste da issue no bloco correto, sem remover ou modificar testes existentes.

#### Regras de implementação

**Unit tests (Vitest):** testam apenas o schema Zod, sem banco. Importe e valide o schema diretamente.

**Integration tests (Vitest):** batem no Supabase real. Cada test deve:
- Criar seus próprios dados no `beforeEach` ou no próprio test
- Limpar os dados criados no `afterEach` ou `afterAll`
- Nunca depender de dados de outro test

**E2E tests (Playwright):** simulam o usuário no navegador. Siga o fluxo descrito no plano passo a passo.

#### Formato dos testes

Use o mesmo padrão do plano:
- ✅ casos que devem passar (`it('should ...')`)
- ❌ casos que devem retornar erro (`it('should reject ...' / 'should not ...')`)

Nomeie os `describe` blocks pelo número e título da issue para rastreabilidade:
```typescript
describe('Issue 08 — Validar e-mail já em uso', () => { ... })
```

### Passo 4 — Executar os testes

Execute apenas o arquivo de teste da issue:

```bash
npx vitest run [caminho-do-arquivo]
```

Para E2E, rode o arquivo indicado no plano:
```bash
npx playwright test [caminho-do-arquivo-e2e]
```

**Se algum teste falhar:** corrija o teste (ou o código, se o teste revelar um bug real) antes de continuar. Não avance com testes quebrados.

### Passo 5 — Reportar

Ao final, mostre um resumo conciso:

```
## Testes — Issue [N]: [Título]

**Arquivo:** src/test/[arquivo].ts
**Casos implementados:** [N]
**Resultado:** ✅ todos passando  (ou ❌ [N] falhando)

Casos cobertos:
- ✅ [descrição do caso]
- ✅ [descrição do caso]
- ❌ [descrição do caso que falhou, se houver]
```

## Regras

- Nunca invente testes além do que está no plano — implemente exatamente o que está mapeado para a issue
- Nunca modifique testes existentes de outras issues no mesmo arquivo
- Se o plano descrever um teste como `❌ Rejeita X`, o test deve assertar que a operação falha (não que passa)
- Integration tests sempre limpam após si mesmos — sem dados residuais entre tests
- Não implemente mocks do banco de dados — use o Supabase real conforme configurado em `.env.local`
