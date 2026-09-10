# Plano de Testes — Módulo 3: Gestão de Contatos

> Documento de referência para implementação dos testes automatizados do Módulo 3.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 3 implementa o cadastro e enriquecimento de contatos (leads e clientes) do workspace. Os testes mais críticos envolvem o isolamento multi-tenant dos contatos, as regras de visibilidade por papel (Atendente só vê os seus), a classificação automática derivada do pipeline e a unicidade do número de WhatsApp por workspace.

**Prioridade máxima:** RBAC da visibilidade de contatos, unicidade de WhatsApp por workspace e isolamento multi-tenant.

---

## 1. Unit Tests (Vitest)

### Schema de criação de contato

Arquivo: `src/test/contato-schema.test.ts`

```
✅ Aceita contato com nome e WhatsApp válidos (campos obrigatórios)
✅ Aceita contato com todos os campos preenchidos (nome, WhatsApp, tipo, nicho, cidade, ICP)
✅ Aceita contato com campos opcionais ausentes
❌ Rejeita contato sem nome
❌ Rejeita contato sem número de WhatsApp
❌ Rejeita contato com número de WhatsApp em formato inválido
```

### Schema de registro de compra

Arquivo: `src/test/contato-compra.test.ts`

```
✅ Aceita registro de compra com data e valor positivo
❌ Rejeita compra com valor zero
❌ Rejeita compra com valor negativo
❌ Rejeita compra sem data
```

### Cálculo de ticket médio

Arquivo: `src/test/contato-ticket-medio.test.ts`

```
✅ Retorna zero quando não há compras
✅ Retorna o valor exato quando há uma compra
✅ Retorna a média correta para múltiplas compras
✅ Recalcula corretamente após adicionar nova compra
```

### Classificação automática derivada do pipeline

Arquivo: `src/test/contato-classificacao.test.ts`

```
✅ Contato sem card retorna classificação "Sem histórico"
✅ Contato com card em Expansão (etapa != "Primeira Compra") retorna "Lead"
✅ Contato com card em Retenção na etapa "Em Onboarding" retorna "Ativo"
✅ Contato com card em Retenção na etapa "Cliente Ativo" retorna "Ativo"
✅ Contato com card em Retenção na etapa "Aguardando Recompra" retorna "Ativo"
✅ Contato com card em Retenção na etapa "Recompra Realizada" retorna "Ativo"
✅ Contato com card em Retenção na etapa "Em Risco" retorna "Em Risco"
✅ Contato com card em Retenção na etapa "Inativo" retorna "Inativo"
✅ Contato com card em Retenção na etapa "Perdido" retorna "Perdido"
✅ Quando há card em Expansão e em Retenção simultaneamente, a classificação do Funil de Retenção tem precedência
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final (use `afterEach` ou `afterAll`). Nunca dependa de dados deixados por outro teste.

---

### Lista de Contatos — Visibilidade por Papel (CRÍTICO — RBAC)

Arquivo: `src/test/contatos-lista.integration.test.ts`

**Listar contatos por papel**
```
✅ Admin visualiza todos os contatos do workspace
✅ Gerente visualiza todos os contatos do workspace
✅ Atendente visualiza apenas contatos atribuídos a ele (via conversa ou card de pipeline)
✅ Atendente NÃO vê contatos de outros atendentes
✅ Admin da Empresa A NÃO vê contatos da Empresa B (isolamento multi-tenant)
```

**Busca e filtros**
```
✅ Busca por nome parcial retorna contatos correspondentes
✅ Busca por número de WhatsApp retorna o contato correspondente
✅ Filtro por classificação retorna apenas contatos com aquela classificação
✅ Filtro por tipo retorna apenas contatos do tipo selecionado
✅ Múltiplos filtros aplicados simultaneamente retornam a interseção correta
✅ Busca sem resultado retorna lista vazia (não erro)
```

---

### Criação de Contato

Arquivo: `src/test/contatos-criacao.integration.test.ts`

```
✅ Admin cria contato com nome e WhatsApp (campos obrigatórios) — sucesso
✅ Gerente cria contato com todos os campos preenchidos — sucesso
✅ Contato criado pertence ao workspace correto
✅ Contato criado aparece na lista com classificação "Sem histórico"
❌ Atendente não consegue criar contato manualmente
❌ Criação rejeitada se o número de WhatsApp já existir no mesmo workspace
✅ Número de WhatsApp duplicado em workspace diferente é permitido (sem conflito entre empresas)
```

---

### Edição de Perfil do Contato

Arquivo: `src/test/contatos-perfil.integration.test.ts`

**Edição de dados**
```
✅ Usuário edita nome do contato e a mudança é persistida
✅ Usuário edita tipo, nicho, cidade e ICP — mudanças são persistidas
✅ Usuário edita observações do contato — mudanças são persistidas
❌ Edição rejeitada com nome em branco
✅ Número de WhatsApp não pode ser alterado após a criação
```

**Tags**
```
✅ Usuário adiciona tag ao contato — tag aparece no perfil
✅ Usuário remove tag do contato — tag é removida do perfil
✅ Mesma tag pode existir em contatos diferentes do workspace
✅ Tag não pode ser adicionada a contato de outro workspace
```

**Registro de compras**
```
✅ Admin registra compra com data e valor — compra aparece no histórico
✅ Gerente registra compra com data e valor — compra aparece no histórico
✅ Ticket médio é recalculado corretamente após cada nova compra
❌ Atendente não consegue registrar compra
❌ Compra com valor zero é rejeitada
❌ Compra com valor negativo é rejeitada
```

---

### Classificação Automática (Integração com Pipeline)

Arquivo: `src/test/contatos-classificacao.integration.test.ts`

```
✅ Contato sem card retorna classificação "Sem histórico"
✅ Contato com card em Expansão exibe classificação "Lead"
✅ Contato cujo card de Expansão chegou a "Primeira Compra" e gerou card em Retenção exibe classificação derivada da etapa de Retenção
✅ Mover o card de Retenção para "Em Risco" atualiza a classificação do contato para "Em Risco"
✅ Mover o card de Retenção para "Perdido" atualiza a classificação do contato para "Perdido"
```

---

### Timeline do Contato

Arquivo: `src/test/contatos-timeline.integration.test.ts`

```
✅ Timeline retorna eventos em ordem cronológica decrescente
✅ Criação de card no pipeline gera evento "Card criado" na timeline
✅ Movimentação de card no pipeline gera evento "Mudança de etapa" na timeline
✅ Nota interna adicionada no painel do card gera evento na timeline com preview do texto
✅ Compra registrada no perfil gera evento na timeline
✅ Edição de dados do contato gera evento na timeline informando os campos alterados
✅ Timeline NÃO exibe eventos de contatos de outro workspace
✅ Filtro por tipo de evento retorna apenas os eventos daquele tipo
✅ Timeline de contato sem histórico retorna lista vazia (não erro)
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-3.spec.ts`

Simulam um usuário real no navegador. Executar com `npx playwright test`.

---

### Fluxo 1 — Criar e enriquecer contato do zero

```
1. Loga como Admin
2. Acessa a lista de Contatos
3. Clica em "Novo contato"
4. Preenche nome, número de WhatsApp, tipo "Revendedor", nicho "Moda Feminina", cidade "Fortaleza", ICP "Primeira vez no nicho"
5. Salva e verifica que o contato aparece na lista com classificação "Sem histórico"
6. Clica no contato e abre o Perfil
7. Adiciona tag "vip"
8. Edita as observações: "Cliente indicado pela Maria — tem loja no centro"
9. Registra compra: data de hoje, valor R$ 1.200,00
10. Verifica que o histórico de compras mostra a compra e o ticket médio é R$ 1.200,00
11. Registra segunda compra: valor R$ 800,00
12. Verifica que o ticket médio é atualizado para R$ 1.000,00
```

---

### Fluxo 2 — RBAC de visibilidade de contatos

```
1. Cria Empresa A com Admin A, Atendente 1 e Atendente 2
2. Cria dois contatos: Contato X atribuído ao Atendente 1, Contato Y atribuído ao Atendente 2 (via card de pipeline)
3. Loga como Atendente 1 → vê apenas o Contato X na lista de Contatos
4. Loga como Atendente 2 → vê apenas o Contato Y na lista de Contatos
5. Loga como Admin A → vê os dois contatos
6. Cria Empresa B com Admin B → Admin B não vê nenhum contato da Empresa A
```

---

### Fluxo 3 — Classificação automática refletindo o pipeline

```
1. Loga como Admin
2. Acessa a lista de Contatos e localiza um contato sem card de pipeline
3. Verifica que a classificação exibida é "Sem histórico"
4. Navega para o Pipeline de Expansão e cria um card para esse contato na etapa "Lead"
5. Volta para a lista de Contatos e verifica que a classificação agora é "Lead"
6. Move o card para "Primeira Compra" no pipeline (o sistema cria automaticamente um card em "Em Onboarding" no Funil de Retenção)
7. Volta para a lista de Contatos e verifica que a classificação agora é "Ativo"
8. Move o card de Retenção para "Em Risco"
9. Volta para a lista e verifica que a classificação é "Em Risco"
```

---

### Fluxo 4 — Timeline unificada do contato

```
1. Loga como Gerente
2. Abre o Perfil de um contato que já tem histórico de pipeline
3. Acessa a aba Timeline
4. Verifica que os eventos de mudança de etapa do pipeline aparecem com data e nome do usuário
5. Adiciona uma nota interna no card do pipeline desse contato
6. Volta à Timeline e verifica que o evento da nota aparece com o preview do texto
7. Registra uma compra no Perfil do contato
8. Verifica que o evento de compra aparece na Timeline
9. Aplica filtro "Apenas pipeline" e verifica que apenas eventos de pipeline são exibidos
10. Remove o filtro e verifica que todos os eventos voltam a aparecer
```

---

### Fluxo 5 — Busca e filtros na lista de contatos

```
1. Loga como Admin
2. Acessa a lista de Contatos (workspace com múltiplos contatos de tipos e classificações variadas)
3. Busca por nome parcial e verifica que apenas contatos correspondentes aparecem
4. Limpa a busca e aplica filtro por classificação "Ativo"
5. Verifica que apenas contatos com card ativo no Funil de Retenção aparecem
6. Adiciona filtro por tipo "Lojista" e verifica que a lista é restringida corretamente
7. Remove todos os filtros e verifica que a lista volta ao estado original
8. Tenta criar um contato com número de WhatsApp já cadastrado no workspace
9. Verifica que o sistema exibe mensagem de erro e não cria o duplicado
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Reutilizar as mesmas do Módulo 0, 1 e 2 (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>
```

Não há dependência de APIs externas (WhatsApp, Meta) para os testes de contatos.

---

## 5. Ordem de implementação dos testes

Criar os testes junto com cada issue, nunca depois.

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (lista e perfil UI mock) | Nenhum — apenas UI mock |
| Issue listar contatos por papel | Integration: RBAC + isolamento multi-tenant (CRÍTICO) |
| Issue criar contato | Integration: criação + unicidade de WhatsApp |
| Issue editar perfil do contato | Integration: edição de dados + tags |
| Issue classificação automática | Unit: cálculo de classificação; Integration: integração com pipeline |
| Issue registrar compra | Unit: schema + ticket médio; Integration: persistência por papel |
| Issue timeline do contato | Integration: eventos de cada tipo + isolamento |
| Ao final do módulo | E2E: todos os 5 fluxos acima |
