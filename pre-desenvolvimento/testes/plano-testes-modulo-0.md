# Plano de Testes — Módulo 0: Fundação

> Documento de referência para implementação dos testes automatizados do Módulo 0.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 0 é a fundação multi-tenant do CRM Exponencial. Os testes aqui são os mais críticos do projeto — um bug de isolamento entre empresas comprometeria toda a segurança do produto.

**Prioridade máxima:** issues 10, 11, 15 e 21 (multi-tenant e criação de workspace).

---

## 1. Unit Tests (Vitest)

Arquivo: `src/test/cadastro.test.ts`

Cobrem apenas validações de formulário puras via schema Zod — sem banco de dados.

### Schema de validação do cadastro (issues 07 e 09)

```
✅ Aceita dados válidos completos
❌ Rejeita nome da empresa vazio
❌ Rejeita nome do responsável vazio
❌ Rejeita e-mail com formato inválido
❌ Rejeita senha com menos de 8 caracteres
❌ Rejeita quando confirmação de senha não coincide com senha
❌ Rejeita e-mail vazio
❌ Rejeita senha vazia
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final (use `afterEach` ou `afterAll`). Nunca dependa de dados deixados por outro teste.

---

### Cadastro de Empresa

Arquivo: `src/test/cadastro-empresa.integration.test.ts`

**Issue 08 — Validar e-mail já em uso**
```
✅ Retorna erro se e-mail já está cadastrado
✅ Permite cadastro com e-mail novo
```

**Issue 10 — Criar workspace isolado**
```
✅ Cria um registro na tabela companies com os dados corretos
✅ Empresa A não consegue acessar dados da Empresa B (isolamento)
✅ Dois cadastros simultâneos criam dois workspaces distintos
```

**Issue 11 — Criar Admin e times padrão**
```
✅ Primeiro usuário criado tem papel 'admin'
✅ Times 'Expansão' e 'Retenção' são criados automaticamente
✅ Times padrão têm flag is_default = true
✅ Times padrão pertencem à empresa correta (não vazam para outra empresa)
```

---

### Gestão de Usuários

Arquivo: `src/test/usuarios.integration.test.ts`

**Issue 14 — Adicionar usuário**
```
✅ Admin cria usuário com papel 'gerente' e este aparece na lista
✅ Admin cria usuário com papel 'atendente' e este aparece na lista
✅ Usuário criado pertence ao workspace correto
❌ Não-admin não consegue criar usuário (retorna erro de permissão)
```

**Issue 15 — Listar usuários (CRÍTICO — multi-tenant)**
```
✅ Admin da Empresa A vê apenas usuários da Empresa A
✅ Admin da Empresa A NÃO vê usuários da Empresa B
✅ Lista retorna nome, e-mail, papel, times e status de cada usuário
```

**Issue 16 — Editar papel**
```
✅ Admin altera papel de 'atendente' para 'gerente'
❌ Admin não consegue alterar o próprio papel
❌ Atendente não consegue alterar papel de ninguém
```

**Issues 17 e 18 — Gerenciar times do usuário**
```
✅ Admin adiciona usuário ao time Expansão
✅ Admin remove usuário do time Expansão
✅ Usuário pode pertencer a múltiplos times simultaneamente
```

**Issue 19 — Desativar usuário**
```
✅ Admin desativa um atendente (status muda para 'inactive')
✅ Usuário desativado perde acesso ao sistema
❌ Admin não consegue desativar a si mesmo
```

**Issue 20 — Reativar usuário**
```
✅ Admin reativa usuário inativo (status volta para 'active')
✅ Usuário reativado recupera acesso ao sistema
```

---

### Gestão de Times

Arquivo: `src/test/times.integration.test.ts`

**Issue 21 — Listar times (CRÍTICO — multi-tenant)**
```
✅ Admin da Empresa A vê apenas times da Empresa A
✅ Admin da Empresa A NÃO vê times da Empresa B
✅ Lista inclui times padrão (Expansão, Retenção) e personalizados
```

**Issue 22 — Criar time personalizado**
```
✅ Admin cria time com nome válido
✅ Time criado tem is_default = false
✅ Time criado pertence ao workspace correto
```

**Issue 23 — Editar nome de time personalizado**
```
✅ Admin edita nome de time personalizado
❌ Admin não consegue editar nome do time 'Expansão'
❌ Admin não consegue editar nome do time 'Retenção'
```

**Issue 24 — Excluir time personalizado**
```
✅ Admin exclui time personalizado
✅ Usuários do time excluído não são excluídos (apenas desassociados)
❌ Admin não consegue excluir o time 'Expansão'
❌ Admin não consegue excluir o time 'Retenção'
```

**Issue 25 — Gerenciar membros do time**
```
✅ Admin adiciona usuário a um time pela tela de times
✅ Admin remove usuário de um time pela tela de times
✅ Mesmo usuário pode estar em Expansão e Retenção ao mesmo tempo
```

---

### Perfil do Usuário

Arquivo: `src/test/perfil.integration.test.ts`

**Issue 29 — Alterar senha**
```
✅ Usuário altera senha com senha atual correta
❌ Rejeita se senha atual estiver incorreta
❌ Rejeita se nova senha e confirmação não coincidirem
```

**Issue 30 — Logout**
```
✅ Sessão é encerrada após logout
✅ Usuário é redirecionado para /login após logout
✅ Token de sessão é invalidado (requisição autenticada falha após logout)
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-0.spec.ts`

Simulam um usuário real no navegador. Executar com `npx playwright test`.

---

### Fluxo 1 — Cadastro completo (issues 07–12)

```
1. Acessa /cadastro
2. Preenche todos os campos corretamente
3. Clica em "Criar conta"
4. Verifica redirecionamento para o dashboard
5. Verifica que os times Expansão e Retenção existem
6. Verifica que o usuário logado tem papel Admin
```

Variantes:
```
❌ Tenta cadastrar com e-mail já existente → vê mensagem de erro
❌ Tenta cadastrar com senhas diferentes → vê mensagem de erro no campo
❌ Tenta cadastrar com campos vazios → vê erros individuais por campo
```

---

### Fluxo 2 — Login (issue 13)

```
1. Acessa /login
2. Preenche e-mail e senha corretos
3. Clica em "Entrar"
4. Verifica redirecionamento para o dashboard
```

Variantes:
```
❌ Credenciais erradas → vê mensagem de erro genérica
❌ Usuário desativado tenta login → vê mensagem de erro genérica
```

---

### Fluxo 3 — Isolamento multi-tenant (issues 10, 15, 21)

```
1. Cria Empresa A com Admin A
2. Cria Empresa B com Admin B
3. Loga como Admin A
4. Verifica que /configuracoes/usuarios mostra apenas usuários da Empresa A
5. Verifica que /configuracoes/times mostra apenas times da Empresa A
6. Loga como Admin B
7. Verifica que os dados da Empresa A não aparecem em nenhuma tela
```

---

## 4. Configuração necessária

### Variáveis de ambiente para testes

Adicionar ao `.env.local`:
```
# Supabase local (supabase start) ou projeto de teste separado
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>  # apenas para setup de testes
```

### Scripts

Adicionar ao `package.json`:
```json
"test:integration": "vitest run src/test/*.integration.test.ts",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

---

## 5. Ordem de implementação dos testes

Issues 01–08 já implementadas. Criar os testes em bloco antes de continuar.

### Bloco 1 — Retroativo (issues 01–08 já implementadas)

| Prioridade | Testes a criar |
|---|---|
| **1º** | Unit: schema Zod do cadastro (issue 07) |
| **2º** | Integration: e-mail já em uso (issue 08) |

### Bloco 2 — A partir daqui, criar junto com cada issue

| Após implementar | Testes a criar |
|---|---|
| Issues 09–12 | Integration: workspace isolado + Admin + times padrão |
| Issue 13 | E2E: fluxo cadastro completo + login |
| Issue 15 | Integration: isolamento multi-tenant usuários |
| Issues 16–20 | Integration: regras de papel e desativação |
| Issue 21 | Integration: isolamento multi-tenant times |
| Issues 22–25 | Integration: proteção times padrão + membros |
| Issues 26–27 | Integration: conexão WhatsApp (mock da API Meta) |
| Issues 28–30 | Integration: perfil + senha + logout |
| Ao final do módulo | E2E: isolamento multi-tenant completo |
