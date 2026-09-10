# Plano de Testes — Módulo 2: Pipeline de Vendas Atacado

> Documento de referência para implementação dos testes automatizados do Módulo 2.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 2 implementa os dois funis de vendas do método atacado exponencial: Expansão (novos clientes) e Retenção (clientes ativos). Os testes mais críticos envolvem o isolamento multi-tenant dos cards, as regras de visibilidade por papel (Atendente só vê o que é seu), e a transição automática de Expansão → Retenção ao chegar na etapa "Primeira Compra".

**Prioridade máxima:** RBAC da visibilidade de cards, transição automática entre funis e isolamento multi-tenant.

---

## 1. Unit Tests (Vitest)

### Schema de criação de card (Novo lead)

Arquivo: `src/test/pipeline-card.test.ts`

```
✅ Aceita contato válido (número de WhatsApp existente)
❌ Rejeita card sem contato informado
❌ Rejeita card com número de WhatsApp inválido (formato incorreto)
```

### Schema de nota interna do card

Arquivo: `src/test/pipeline-nota.test.ts`

```
✅ Aceita nota com conteúdo válido
❌ Rejeita nota com conteúdo vazio
❌ Rejeita nota com mais de 2000 caracteres
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final (use `afterEach` ou `afterAll`). Nunca dependa de dados deixados por outro teste.

---

### Funil de Expansão — Visibilidade por Papel (CRÍTICO — RBAC)

Arquivo: `src/test/pipeline-expansao.integration.test.ts`

**Listar cards por papel**
```
✅ Atendente vê apenas os cards atribuídos a ele no funil de Expansão
✅ Atendente NÃO vê cards atribuídos a outro atendente
✅ Gerente vê todos os cards do funil de Expansão do workspace
✅ Admin vê todos os cards do funil de Expansão do workspace
✅ Admin da Empresa A NÃO vê cards da Empresa B (isolamento multi-tenant)
```

**Criar novo card (Novo lead)**
```
✅ Admin cria card na etapa "Lead" com contato válido
✅ Gerente cria card na etapa "Lead" com contato válido
✅ Card criado pertence ao workspace correto
✅ Card criado aparece na coluna "Lead" do funil de Expansão
❌ Atendente não consegue criar novo card
❌ Não é possível criar card com o mesmo contato já existente no funil de Expansão (duplicata)
```

**Mover card entre etapas**
```
✅ Qualquer usuário com acesso ao card consegue mover para etapa diferente
✅ Sistema registra data, hora e usuário da movimentação no histórico do card
✅ Card aparece na nova coluna após a movimentação
✅ Card some da coluna anterior após a movimentação
```

**Transição automática Expansão → Retenção**
```
✅ Mover card para "Primeira Compra" cria automaticamente um card em "Em Onboarding" no Funil de Retenção
✅ O card criado no Funil de Retenção está vinculado ao mesmo contato
✅ O card em "Primeira Compra" no Funil de Expansão permanece visível (não é removido)
✅ Não cria duplicata se o contato já tiver um card ativo no Funil de Retenção
```

**Atribuição de card**
```
✅ Admin atribui card sem atendente a um atendente do workspace
✅ Gerente atribui card sem atendente a um atendente do workspace
✅ Admin reatribui card de um atendente para outro
✅ Atendente do card aparece no card após atribuição
❌ Atendente não consegue reatribuir card para outro atendente
❌ Admin não consegue atribuir card a usuário de outro workspace
```

---

### Funil de Retenção — Visibilidade por Papel (CRÍTICO — RBAC)

Arquivo: `src/test/pipeline-retencao.integration.test.ts`

**Listar cards por papel**
```
✅ Atendente vê apenas os cards atribuídos a ele no funil de Retenção
✅ Atendente NÃO vê cards atribuídos a outro atendente
✅ Gerente vê todos os cards do funil de Retenção do workspace
✅ Admin vê todos os cards do funil de Retenção do workspace
✅ Admin da Empresa A NÃO vê cards da Empresa B (isolamento multi-tenant)
```

**Mover card entre etapas**
```
✅ Card movido para "Recompra Realizada" e confirmado pelo usuário é movido para "Aguardando Recompra"
✅ Sistema registra ambas as movimentações no histórico do card (para "Recompra Realizada" e para "Aguardando Recompra")
✅ Cards nas etapas "Em Risco" e "Inativo" são retornados com flag de alerta
✅ Cards na etapa "Perdido" são retornados com flag de inativo
```

---

### Painel do Card

Arquivo: `src/test/pipeline-painel.integration.test.ts`

**Histórico de etapas**
```
✅ Histórico exibe todas as movimentações em ordem cronológica
✅ Cada entrada do histórico contém data, etapa anterior, etapa nova e nome do usuário que moveu
✅ Primeira entrada do histórico registra a etapa inicial "Lead" com a data de criação do card
```

**Notas internas**
```
✅ Qualquer usuário com acesso ao card pode adicionar nota interna
✅ Nota é salva com id do autor e timestamp
✅ Nota é visível para todos os usuários do workspace com acesso ao card
✅ Nota NÃO é enviada como mensagem de WhatsApp ao contato
❌ Usuário de outro workspace não consegue ver as notas do card
```

**Reatribuição pelo painel**
```
✅ Admin reatribui card a outro atendente pelo painel e a mudança reflete no kanban
✅ Gerente reatribui card a outro atendente pelo painel
❌ Atendente não consegue reatribuir o card pelo painel
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-2.spec.ts`

Simulam um usuário real no navegador. Executar com `npx playwright test`.

---

### Fluxo 1 — Jornada completa de um lead no Funil de Expansão

```
1. Loga como Admin
2. Acessa o Funil de Expansão
3. Clica em "Novo lead" e informa um número de WhatsApp existente
4. Verifica que o card aparece na coluna "Lead"
5. Atribui o card ao Atendente A (Time Expansão)
6. Loga como Atendente A
7. Verifica que o card aparece no funil (apenas o do Atendente A)
8. Arrasta o card de "Lead" para "Em Qualificação"
9. Verifica que o card some de "Lead" e aparece em "Em Qualificação"
10. Clica no card e verifica que o histórico registra a movimentação
11. Arrasta o card até "Primeira Compra"
12. Verifica que o card permanece em "Primeira Compra" no Funil de Expansão
13. Navega para o Funil de Retenção
14. Verifica que o card aparece em "Em Onboarding" no Funil de Retenção
```

---

### Fluxo 2 — RBAC de visibilidade de cards

```
1. Cria Empresa A com Admin A, Atendente 1 (Time Expansão) e Atendente 2 (Time Expansão)
2. Loga como Admin A e cria dois cards: um atribuído ao Atendente 1, outro ao Atendente 2
3. Loga como Atendente 1 → vê apenas o card atribuído a ele
4. Loga como Atendente 2 → vê apenas o card atribuído a ele
5. Loga como Admin A → vê os dois cards
6. Cria Empresa B com Admin B → Admin B não vê nenhum card da Empresa A
```

---

### Fluxo 3 — Painel do card: histórico e notas

```
1. Loga como Admin
2. Cria um card no Funil de Expansão na etapa "Lead"
3. Move o card para "Em Qualificação" via dropdown do painel
4. Abre o painel do card
5. Verifica que o histórico mostra as duas etapas: "Lead" e "Em Qualificação"
6. Adiciona nota interna: "Cliente qualificado — confirmar nicho antes de enviar catálogo"
7. Verifica que a nota aparece no painel com o nome do autor e a data
8. Clica em "Abrir conversa" e verifica que é redirecionado para o Chat do contato
9. Volta ao pipeline e verifica que o card ainda está em "Em Qualificação"
```

---

### Fluxo 4 — Ciclo de recompra no Funil de Retenção

```
1. Loga como Gerente
2. Acessa o Funil de Retenção
3. Localiza um card em "Cliente Ativo" e arrasta para "Aguardando Recompra"
4. Move o card de "Aguardando Recompra" para "Recompra Realizada"
5. Confirma a ação no modal de confirmação
6. Verifica que o card é movido automaticamente para "Aguardando Recompra"
7. Abre o painel do card e verifica que o histórico registra todas as movimentações
```

---

### Fluxo 5 — Acesso à conversa de WhatsApp pelo pipeline

```
1. Loga como Atendente
2. Acessa o Funil de Expansão
3. Localiza um card atribuído a ele
4. Clica no ícone de conversa do card
5. Verifica que é redirecionado para o Chat e a conversa do contato está aberta
6. Volta para o pipeline usando a navegação
7. Verifica que o pipeline continua exibindo o estado correto dos cards
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Reutilizar as mesmas do Módulo 0 e Módulo 1 (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>
```

Não há dependência de APIs externas (WhatsApp, Meta) para os testes do pipeline — o card apenas referencia o contato/conversa existente.

---

## 5. Ordem de implementação dos testes

Criar os testes junto com cada issue, nunca depois.

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (kanban UI mock) | Nenhum — apenas UI mock |
| Issue listar cards por papel | Integration: RBAC Expansão + RBAC Retenção (CRÍTICO) |
| Issue criar novo card | Integration: criar card + validação de duplicata |
| Issue mover card entre etapas | Integration: movimentação + histórico |
| Issue transição automática Expansão → Retenção | Integration: criação do card em Retenção |
| Issue atribuição de card | Integration: atribuição e reatribuição por papel |
| Issue notas internas | Integration: notas + isolamento multi-tenant |
| Issue ciclo de recompra | Integration: recompra realizada → aguardando recompra |
| Ao final do módulo | E2E: todos os 5 fluxos acima |
