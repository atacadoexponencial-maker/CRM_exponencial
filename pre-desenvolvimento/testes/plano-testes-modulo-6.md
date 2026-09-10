# Plano de Testes — Módulo 6: Grupos WhatsApp

> Documento de referência para implementação dos testes automatizados do Módulo 6.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 6 implementa criação e gestão de grupos de WhatsApp via API Oficial Meta. Os testes mais críticos envolvem o RBAC de visibilidade (Atendente só vê grupos em que está incluído), o isolamento multi-tenant e a correta propagação de ações para a API do WhatsApp. Chamadas à API real da Meta são substituídas por stubs em todos os testes automatizados.

**Prioridade máxima:** RBAC de visibilidade de grupos, isolamento multi-tenant e tratamento de falhas da API do WhatsApp.

---

## 1. Unit Tests (Vitest)

### Schema de criação de grupo

Arquivo: `src/test/grupo-schema.test.ts`

```
✅ Aceita criação de grupo com nome válido
✅ Aceita criação sem membros iniciais (grupo vazio)
✅ Aceita criação com lista de membros iniciais
❌ Rejeita criação sem nome
❌ Rejeita nome em branco (somente espaços)
```

### Schema de envio de mensagem ao grupo

Arquivo: `src/test/grupo-mensagem.test.ts`

```
✅ Aceita mensagem de texto com conteúdo válido
✅ Aceita mensagem de imagem com arquivo e legenda
✅ Aceita mensagem de documento com arquivo e legenda
✅ Aceita mensagem de imagem sem legenda
❌ Rejeita mensagem de texto com conteúdo vazio
❌ Rejeita mensagem de imagem sem arquivo
❌ Rejeita mensagem de documento sem arquivo
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real. Chamadas à API do WhatsApp são substituídas por stubs que simulam respostas de sucesso ou falha.

> **Importante:** cada teste deve criar dados próprios e limpar ao final.

---

### Lista e Visibilidade de Grupos (CRÍTICO — RBAC)

Arquivo: `src/test/grupos-lista.integration.test.ts`

```
✅ Admin visualiza todos os grupos do workspace
✅ Gerente visualiza todos os grupos do workspace
✅ Atendente visualiza apenas os grupos em que está incluído como participante
✅ Atendente NÃO vê grupos em que não foi incluído
✅ Admin da Empresa A NÃO vê grupos da Empresa B (isolamento multi-tenant)
✅ Filtro por time retorna apenas grupos associados àquele time
✅ Busca por nome retorna apenas grupos com nome correspondente
```

### Criação de Grupo

Arquivo: `src/test/grupos-criacao.integration.test.ts`

```
✅ Admin cria grupo com nome — chamada à API do WhatsApp é feita com os parâmetros corretos
✅ Gerente cria grupo com nome — sucesso
✅ Grupo criado aparece na lista com status correto
✅ Membros iniciais selecionados são adicionados ao grupo via API na criação
✅ Atendentes selecionados como participantes do workspace passam a ver o grupo
❌ Atendente não consegue criar grupo
❌ Criação rejeitada sem nome
✅ Quando a API do WhatsApp retorna erro, o grupo NÃO é salvo no banco e o erro é exposto ao usuário
```

### Gerenciamento de Membros

Arquivo: `src/test/grupos-membros.integration.test.ts`

**Participantes do workspace (gestores no CRM)**
```
✅ Admin adiciona atendente como participante do workspace — atendente passa a ver o grupo
✅ Gerente adiciona atendente como participante do workspace
✅ Admin remove atendente como participante — atendente deixa de ver o grupo
❌ Atendente não consegue adicionar ou remover participantes do workspace
```

**Membros externos (contatos no WhatsApp)**
```
✅ Admin adiciona contato cadastrado ao grupo — chamada à API do WhatsApp é feita
✅ Gerente adiciona contato cadastrado ao grupo
✅ Admin remove contato do grupo — chamada à API do WhatsApp é feita
✅ Quando a API retorna erro ao adicionar membro, o contato NÃO é registrado como membro e o erro é exposto
❌ Atendente não consegue adicionar ou remover membros externos
```

### Envio de Mensagens ao Grupo

Arquivo: `src/test/grupos-mensagens.integration.test.ts`

```
✅ Admin envia mensagem de texto ao grupo — chamada à API é feita com o conteúdo correto
✅ Gerente envia mensagem de texto ao grupo
✅ Atendente incluído como participante envia mensagem ao grupo
✅ Mensagem enviada aparece no histórico do grupo com nome do remetente e horário
✅ Mensagem de imagem é enviada com o arquivo e a legenda corretos
✅ Mensagem de documento é enviada com o arquivo e a legenda corretos
✅ Quando a API retorna erro no envio, a mensagem NÃO é gravada no histórico e o erro é exposto
❌ Atendente não incluído como participante não consegue enviar mensagem ao grupo
```

### Edição e Encerramento

Arquivo: `src/test/grupos-edicao.integration.test.ts`

```
✅ Admin edita o nome do grupo — chamada à API é feita e o nome é atualizado no banco
✅ Gerente edita o nome do grupo
✅ Admin altera o time associado — mudança reflete nos filtros da lista
✅ Admin encerra o grupo — chamada à API é feita e o grupo some da lista de ativos
✅ Grupo encerrado aparece como encerrado no histórico (não é apagado do banco)
✅ Quando a API retorna erro ao encerrar, o grupo NÃO é marcado como encerrado
❌ Atendente não consegue editar o nome do grupo
❌ Atendente não consegue encerrar o grupo
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-6.spec.ts`

Os testes E2E usam o stub da API do WhatsApp para simular respostas de sucesso.

---

### Fluxo 1 — Ciclo completo de um grupo

```
1. Loga como Admin
2. Acessa a lista de Grupos
3. Clica em "Novo grupo"
4. Preenche nome "VIP Moda Feminina", seleciona time "Expansão"
5. Adiciona dois contatos cadastrados como membros iniciais
6. Cria o grupo — verifica que aparece na lista com o nome e time corretos
7. Clica no grupo e acessa o Detalhe
8. Verifica que os dois membros aparecem na lista de membros externos
9. Adiciona um terceiro contato ao grupo pelo Detalhe
10. Envia uma mensagem de texto: "Bem-vindos ao nosso grupo VIP!"
11. Verifica que a mensagem aparece no histórico com o nome do Admin e horário
12. Encerra o grupo e confirma
13. Verifica que o grupo some da lista de ativos
```

---

### Fluxo 2 — RBAC: Atendente vê apenas grupos em que está incluído

```
1. Admin cria Grupo A e Grupo B
2. Admin inclui Atendente A apenas no Grupo A
3. Loga como Atendente A → vê apenas o Grupo A na lista
4. Tenta navegar diretamente para a URL do Grupo B → acesso negado
5. Admin inclui Atendente A no Grupo B
6. Loga como Atendente A → agora vê os dois grupos
7. Atendente A envia mensagem no Grupo B — a mensagem aparece no histórico
```

---

### Fluxo 3 — Tratamento de falha da API do WhatsApp

```
1. Configura stub da API para retornar erro 500 no próximo envio
2. Loga como Admin
3. Tenta criar um grupo
4. Verifica que o sistema exibe mensagem de erro e nenhum grupo é criado na lista
5. Configura stub para retornar sucesso
6. Cria o grupo — sucesso
7. Configura stub para retornar erro 500 no envio de mensagem
8. Tenta enviar mensagem ao grupo
9. Verifica que o sistema exibe mensagem de erro e o histórico não registra a mensagem
```

---

### Fluxo 4 — Gerenciamento de participantes e membros

```
1. Loga como Admin
2. Acessa o Detalhe de um grupo existente
3. Adiciona Atendente B como participante do workspace
4. Loga como Atendente B → vê o grupo na lista e consegue enviar mensagem
5. Loga como Admin e remove o Atendente B como participante
6. Loga como Atendente B → o grupo não aparece mais na lista
7. Loga como Admin e adiciona um novo contato ao grupo via "Adicionar membro ao grupo"
8. Verifica que o contato aparece na lista de membros externos
9. Remove o contato do grupo
10. Verifica que o contato some da lista de membros externos
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Reutilizar as mesmas dos módulos anteriores (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>
WHATSAPP_API_URL=<url-do-stub-local>
WHATSAPP_API_TOKEN=<token-de-teste>
```

### Stub da API do WhatsApp

Usar um servidor HTTP local (ex: `msw` ou `nock`) que simule as respostas da API Oficial Meta. O stub deve ser configurável por teste para simular tanto sucesso quanto falhas, sem bater na API real.

---

## 5. Ordem de implementação dos testes

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (UI mock da lista e detalhe) | Nenhum — apenas UI mock |
| Issue criar grupo | Unit: schema; Integration: criação + RBAC + falha de API |
| Issue gerenciar participantes do workspace | Integration: inclusão/remoção de participante |
| Issue adicionar/remover membros externos | Integration: membros externos + falha de API |
| Issue enviar mensagem ao grupo | Unit: schema de mensagem; Integration: envio + RBAC + falha |
| Issue editar nome e time do grupo | Integration: edição + propagação à API |
| Issue encerrar grupo | Integration: encerramento + histórico |
| Ao final do módulo | E2E: todos os 4 fluxos acima |
