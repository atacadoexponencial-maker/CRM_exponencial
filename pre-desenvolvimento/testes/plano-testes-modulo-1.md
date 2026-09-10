# Plano de Testes — Módulo 1: Chat

> Documento de referência para implementação dos testes automatizados do Módulo 1.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 1 é o coração do CRM — onde acontece toda a comunicação com clientes via WhatsApp. Os testes mais críticos envolvem isolamento multi-tenant nas conversas, regras de papel (quem pode ver, atribuir e transferir o quê) e integridade dos dados de mensagens.

**Prioridade máxima:** issues 06, 29, 30 (RBAC em conversas) e 13 (tempo real).

---

## 1. Unit Tests (Vitest)

### Schema de criação de etiqueta (issues 40–41)

Arquivo: `src/test/etiquetas.test.ts`

```
✅ Aceita nome e cor válidos
❌ Rejeita nome vazio
❌ Rejeita cor vazia
❌ Rejeita nome com mais de 50 caracteres
```

### Schema de criação de mensagem rápida (issues 45–46)

Arquivo: `src/test/mensagens-rapidas.test.ts`

```
✅ Aceita título e conteúdo válidos
❌ Rejeita título vazio
❌ Rejeita conteúdo vazio
❌ Rejeita título com mais de 100 caracteres
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final (use `afterEach` ou `afterAll`). Nunca dependa de dados deixados por outro teste.

---

### Caixa de Entrada — Listagem e Filtros

Arquivo: `src/test/caixa-de-entrada.integration.test.ts`

**Issue 06 — Listar conversas por papel (CRÍTICO — RBAC)**
```
✅ Atendente vê apenas conversas atribuídas a ele
✅ Atendente vê conversas do seu time (sem atribuição específica)
✅ Atendente NÃO vê conversas de outro time
✅ Gerente vê todas as conversas do workspace
✅ Admin vê todas as conversas do workspace
✅ Admin da Empresa A NÃO vê conversas da Empresa B (isolamento multi-tenant)
```

**Issue 07 — Filtrar conversas por status**
```
✅ Filtro "Em espera" retorna apenas conversas sem atribuição
✅ Filtro "Em atendimento" retorna apenas conversas com atribuição ativa
✅ Filtro "Resolvidas" retorna apenas conversas com status resolvido
✅ Filtro "Todas" retorna conversas de todos os status
```

**Issue 08 — Filtrar conversas por etiqueta**
```
✅ Retorna apenas conversas que possuem a etiqueta selecionada
✅ Retorna lista vazia se nenhuma conversa tem a etiqueta
```

**Issue 14 — Nova conversa de número desconhecido**
```
✅ Mensagem recebida de número novo cria conversa com status "Em espera"
✅ Nova conversa aparece para Admin e Gerente
✅ Nova conversa NÃO aparece para Atendente de outro time
```

---

### Conversa — Mensagens

Arquivo: `src/test/mensagens.integration.test.ts`

**Issue 16 — Enviar mensagem de texto**
```
✅ Mensagem é salva no banco com sender_id correto
✅ Mensagem tem status inicial "enviado"
✅ Mensagem pertence à conversa correta
❌ Atendente não consegue enviar mensagem em conversa de outro time
```

**Issue 25 — Adicionar nota interna**
```
✅ Nota é salva com flag is_internal = true
✅ Nota NÃO é enviada via API do WhatsApp
✅ Nota é visível para todos os membros do workspace
```

**Issue 27 — Marcar mensagens como lidas**
```
✅ Abrir conversa zera a contagem de não lidas para o usuário logado
✅ Não afeta a contagem de não lidas de outros usuários
```

**Issue 28 — Status de entrega**
```
✅ Status da mensagem atualiza de "enviado" para "entregue" ao receber webhook
✅ Status da mensagem atualiza de "entregue" para "lido" ao receber webhook
✅ Status muda para "falhou" em caso de erro na entrega
```

---

### Conversa — Atribuição e Transferência

Arquivo: `src/test/atribuicao.integration.test.ts`

**Issue 29 — Atribuir conversa (CRÍTICO — RBAC)**
```
✅ Admin atribui conversa a qualquer atendente do workspace
✅ Gerente atribui conversa a qualquer atendente do workspace
✅ Conversa atribuída muda status para "Em atendimento"
❌ Atendente não consegue atribuir conversa a outro atendente
```

**Issue 30 — Transferir conversa (CRÍTICO — RBAC)**
```
✅ Atendente transfere conversa para outro atendente do mesmo time
✅ Admin transfere conversa para qualquer atendente do workspace
✅ Gerente transfere conversa para qualquer atendente do workspace
❌ Atendente NÃO consegue transferir para atendente de outro time
```

**Issue 31 — Resolver conversa**
```
✅ Conversa muda status para "Resolvida"
✅ Conversa resolvida sai dos filtros "Em espera" e "Em atendimento"
```

**Issue 32 — Reabrir conversa**
```
✅ Conversa com atribuição volta para "Em atendimento" ao ser reaberta
✅ Conversa sem atribuição volta para "Em espera" ao ser reaberta
```

---

### Contato

Arquivo: `src/test/contato.integration.test.ts`

**Issue 35 — Editar nome do contato**
```
✅ Nome atualizado no banco é refletido na lista de conversas
✅ Nome atualizado é refletido no cabeçalho do chat
✅ Nome atualizado pertence ao workspace correto
❌ Usuário de outro workspace não consegue editar o contato
```

**Issue 38 — Número desconhecido como fallback**
```
✅ Contato sem nome exibe o número de telefone em todos os contextos
✅ Após nomear o contato, o número deixa de ser exibido como nome
```

---

### Etiquetas

Arquivo: `src/test/etiquetas.integration.test.ts`

**Issue 39 — Listar etiquetas (multi-tenant)**
```
✅ Admin vê apenas etiquetas do próprio workspace
✅ Admin NÃO vê etiquetas de outro workspace
```

**Issue 40 — Criar etiqueta**
```
✅ Etiqueta é criada com nome e cor corretos
✅ Etiqueta pertence ao workspace correto
✅ Etiqueta criada fica disponível para todos os usuários do workspace
❌ Gerente não consegue criar etiqueta (apenas Admin)
❌ Atendente não consegue criar etiqueta (apenas Admin)
```

**Issue 41 — Editar etiqueta**
```
✅ Nome e cor atualizados são refletidos nas conversas que têm a etiqueta
❌ Gerente não consegue editar etiqueta
```

**Issue 42 — Excluir etiqueta**
```
✅ Etiqueta é removida do banco
✅ Conversas que tinham a etiqueta perdem a associação (não são excluídas)
❌ Gerente não consegue excluir etiqueta
```

**Issue 43 — Aplicar etiqueta na conversa**
```
✅ Qualquer usuário do workspace pode aplicar etiqueta em uma conversa
✅ Conversa aparece no filtro por etiqueta após aplicação
✅ Remoção da etiqueta tira a conversa do filtro correspondente
```

---

### Mensagens Rápidas

Arquivo: `src/test/mensagens-rapidas.integration.test.ts`

**Issues 44–47 — CRUD de mensagens rápidas**
```
✅ Admin cria mensagem rápida com título e conteúdo
✅ Mensagem criada fica disponível para todos os usuários do workspace
✅ Admin edita título e conteúdo de mensagem existente
✅ Admin exclui mensagem e ela some do seletor do chat
❌ Gerente não consegue criar mensagem rápida
❌ Atendente não consegue criar mensagem rápida
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-1.spec.ts`

Simulam um usuário real no navegador. Executar com `npx playwright test`.

---

### Fluxo 1 — Receber e responder conversa (issues 06, 10, 16, 27, 29, 31)

```
1. Simula recebimento de mensagem de número desconhecido via webhook
2. Loga como Admin
3. Verifica que a conversa aparece na caixa de entrada com status "Em espera"
4. Abre a conversa
5. Atribui a conversa a um Atendente
6. Loga como Atendente
7. Verifica que a conversa aparece em "Minhas conversas"
8. Digita e envia mensagem de texto
9. Verifica que a mensagem aparece no histórico com status "enviado"
10. Clica em "Resolver"
11. Verifica que a conversa some do filtro "Em atendimento"
```

---

### Fluxo 2 — RBAC da caixa de entrada (issue 06)

```
1. Cria Empresa A com Admin A, Gerente A e dois Atendentes (Time Expansão e Time Retenção)
2. Cria conversa atribuída ao Atendente do Time Expansão
3. Loga como Atendente do Time Retenção → não vê a conversa
4. Loga como Atendente do Time Expansão → vê a conversa
5. Loga como Gerente A → vê todas as conversas da Empresa A
6. Loga como Admin A → vê todas as conversas da Empresa A
7. Cria Empresa B com Admin B → Admin B não vê conversas da Empresa A
```

---

### Fluxo 3 — Transferência de conversa (issue 30)

```
1. Loga como Admin e atribui conversa ao Atendente A (Time Expansão)
2. Loga como Atendente A
3. Tenta transferir para Atendente B do Time Retenção → opção não disponível
4. Transfere para Atendente C do mesmo Time Expansão → sucesso
5. Loga como Gerente e transfere a mesma conversa para Atendente B (Time Retenção) → sucesso
```

---

### Fluxo 4 — Nomear contato desconhecido (issues 35, 38)

```
1. Simula recebimento de mensagem de número novo
2. Loga como Admin e abre a conversa
3. Verifica que o contato é exibido como o número de telefone
4. Clica no nome no cabeçalho, abre painel de contato
5. Edita o nome para "João Silva" e salva
6. Verifica que o nome "João Silva" aparece no cabeçalho e na lista de conversas
7. Verifica que o número de telefone não é mais exibido como nome
```

---

### Fluxo 5 — Gerenciar etiquetas e aplicar em conversa (issues 40, 43)

```
1. Loga como Admin
2. Acessa /configuracoes/etiquetas
3. Cria etiqueta "VIP" com cor verde
4. Abre uma conversa na caixa de entrada
5. Aplica a etiqueta "VIP" na conversa
6. Volta para a caixa de entrada
7. Filtra por etiqueta "VIP" → conversa aparece no resultado
8. Remove a etiqueta da conversa
9. Filtra novamente → conversa não aparece mais
```

---

### Fluxo 6 — Criar e usar mensagem rápida (issues 45, 48, 50)

```
1. Loga como Admin
2. Acessa /configuracoes/mensagens-rapidas
3. Cria mensagem rápida com título "Boas-vindas" e conteúdo "Olá! Como posso ajudar?"
4. Abre uma conversa no chat
5. Clica no botão de mensagens rápidas
6. Busca por "Boas" no seletor → "Boas-vindas" aparece
7. Seleciona a mensagem → conteúdo preenche o campo de texto
8. Edita o texto antes de enviar e envia
9. Verifica que a mensagem enviada aparece no histórico com o texto editado
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Adicionar ao `.env.local` (já deve existir do Módulo 0):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>

# Necessário para testes de envio de mensagens WhatsApp (usar conta sandbox)
WHATSAPP_API_TOKEN=<token-sandbox-meta>
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id-sandbox>
```

### Webhook local para testes E2E

Os testes de fluxo que dependem de mensagens recebidas precisam de um mecanismo para simular webhooks da API Meta. Use uma fixture de request HTTP direto ao endpoint local:
```
POST http://localhost:3000/api/webhooks/whatsapp
```

---

## 5. Ordem de implementação dos testes

Criar os testes junto com cada issue, nunca depois.

| Após implementar | Testes a criar |
|---|---|
| Issues 01–05 (protótipos) | Nenhum — apenas UI mock |
| Issue 06 | Integration: listar conversas por papel (RBAC) |
| Issues 07–08 | Integration: filtros de status e etiqueta |
| Issues 10–11 (badge + negrito) | Integration: marcar como lidas (issue 27) |
| Issue 13 (tempo real) | Coberto pelos fluxos E2E — não há integration test para Realtime |
| Issue 14 (nova conversa) | Integration: número desconhecido cria conversa "Em espera" |
| Issues 16, 25 | Integration: enviar texto + nota interna |
| Issue 28 (status de entrega) | Integration: atualização de status via webhook |
| Issues 29–32 | Integration: atribuição, transferência, resolver, reabrir |
| Issues 34–38 | Integration: contato — editar nome + fallback de número |
| Issues 39–43 | Integration: etiquetas (CRUD + aplicar em conversa) |
| Issues 44–47 | Integration: mensagens rápidas (CRUD) |
| Ao final do módulo | E2E: todos os 6 fluxos acima |
