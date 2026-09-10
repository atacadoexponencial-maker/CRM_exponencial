# Plano de Testes — Módulo 4: Sequências e Follow-up

> Documento de referência para implementação dos testes automatizados do Módulo 4.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 4 implementa dois mecanismos de nutrição de leads: sequências automáticas (séries de etapas com mensagens automáticas ou lembretes) e follow-ups avulsos. Os testes mais críticos envolvem os gatilhos automáticos de sequências (disparados por movimentações no pipeline do Módulo 2), a idempotência (não iniciar a mesma sequência duas vezes para o mesmo contato) e o RBAC da Agenda (cada vendedor só vê o que é seu).

**Prioridade máxima:** idempotência de gatilhos automáticos, RBAC da agenda e isolamento multi-tenant.

---

## 1. Unit Tests (Vitest)

### Schema de criação de sequência

Arquivo: `src/test/sequencia-schema.test.ts`

```
✅ Aceita sequência com nome e pelo menos uma etapa
✅ Aceita sequência com gatilho automático válido
✅ Aceita sequência com gatilho manual
❌ Rejeita sequência sem nome
❌ Rejeita sequência sem nenhuma etapa
❌ Rejeita sequência com nome em branco
```

### Schema de etapa de sequência

Arquivo: `src/test/sequencia-etapa.test.ts`

```
✅ Aceita etapa de mensagem automática com conteúdo e prazo >= 0
✅ Aceita etapa de lembrete com instrução e prazo >= 0
✅ Aceita prazo zero (mesmo dia)
❌ Rejeita etapa de mensagem automática sem conteúdo
❌ Rejeita etapa de lembrete sem instrução
❌ Rejeita prazo negativo em qualquer tipo de etapa
```

### Substituição de variáveis na mensagem

Arquivo: `src/test/sequencia-variaveis.test.ts`

```
✅ {{nome_contato}} é substituído pelo nome do contato no momento do envio
✅ {{nome_vendedor}} é substituído pelo nome do atendente responsável
✅ Variáveis desconhecidas são mantidas como estão (não causam erro)
✅ Mensagem sem variáveis é enviada sem alteração
✅ Múltiplas ocorrências da mesma variável são todas substituídas
```

### Cálculo de prazo das etapas

Arquivo: `src/test/sequencia-prazos.test.ts`

```
✅ Primeira etapa com prazo 0 é agendada para o mesmo dia do início
✅ Segunda etapa é agendada X dias após a data da primeira etapa
✅ Etapa com prazo 1 dia após etapa executada hoje é agendada para amanhã
✅ Reordenar etapas recalcula os prazos absolutos corretamente
```

### Lógica de geração de alertas

Arquivo: `src/test/alertas-logica.test.ts`

```
✅ Lead no Funil de Expansão sem atividade por 3 dias gera alerta "Lead sem resposta"
✅ Lead no Funil de Expansão com atividade há 2 dias NÃO gera alerta
✅ Card em "Aguardando Recompra" por mais de 30 dias gera alerta "Cliente sem recompra"
✅ Card em "Em Risco" por mais de 7 dias gera alerta "Cliente em risco"
✅ Card em "Inativo" por mais de 15 dias gera alerta "Cliente inativo"
✅ Alerta dispensado não é recriado enquanto o limiar não for atingido novamente
✅ Alterar limiar de dias altera quais contatos são incluídos no alerta
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final (use `afterEach` ou `afterAll`). Nunca dependa de dados deixados por outro teste.

---

### Biblioteca e Editor de Sequências

Arquivo: `src/test/sequencias-biblioteca.integration.test.ts`

**Gestão de sequências por papel**
```
✅ Admin visualiza todas as sequências do workspace
✅ Gerente visualiza todas as sequências do workspace
✅ Admin cria nova sequência personalizada com etapas — sequência persiste
✅ Admin edita nome e etapas de uma sequência pré-definida — mudança persiste
✅ Admin desativa sequência — status muda para Inativa
✅ Admin reativa sequência — status muda para Ativa
✅ Admin exclui sequência personalizada sem contatos em andamento — sucesso
❌ Atendente não consegue criar sequência
❌ Atendente não consegue editar sequência
❌ Admin não consegue excluir sequência pré-definida
❌ Admin não consegue excluir sequência personalizada com contatos em andamento
✅ Admin da Empresa A não vê sequências da Empresa B (isolamento multi-tenant)
```

---

### Ativação de Sequências

Arquivo: `src/test/sequencias-ativacao.integration.test.ts`

**Início manual**
```
✅ Admin inicia sequência manualmente para um contato — etapas são agendadas corretamente
✅ Gerente inicia sequência manualmente para um contato
✅ Atendente inicia sequência manualmente para um contato seu
✅ Primeira etapa com prazo 0 é agendada para hoje
✅ Etapas seguintes são agendadas com os prazos corretos
❌ Não é possível iniciar a mesma sequência duas vezes para o mesmo contato enquanto houver execução em andamento
❌ Atendente não consegue iniciar sequência para contato que não é seu
```

**Gatilhos automáticos (integração com Pipeline)**
```
✅ Criar card na etapa "Lead" no Funil de Expansão dispara a sequência "Qualificação" automaticamente (se ativa)
✅ Mover card para "Catálogo Enviado" dispara a sequência "Pós-catálogo" automaticamente (se ativa)
✅ Criar card na etapa "Em Onboarding" no Funil de Retenção dispara a sequência "Onboarding" automaticamente (se ativa)
✅ Mover card para "Inativo" no Funil de Retenção dispara a sequência "Reativação" automaticamente (se ativa)
✅ Gatilho automático com sequência desativada NÃO inicia execução
✅ Gatilho automático com sequência já em andamento para o contato NÃO cria execução duplicada (idempotência)
```

**Cancelamento**
```
✅ Usuário cancela sequência em andamento — etapas futuras são canceladas
✅ Etapas já executadas da sequência cancelada permanecem no histórico do contato
✅ Após cancelamento, é possível iniciar a mesma sequência novamente para o mesmo contato
```

---

### Agenda do Vendedor

Arquivo: `src/test/agenda-vendedor.integration.test.ts`

**Visibilidade por papel (CRÍTICO — RBAC)**
```
✅ Atendente vê apenas os próprios lembretes e follow-ups
✅ Atendente NÃO vê lembretes de outro atendente
✅ Admin e Gerente veem apenas os próprios itens na Agenda pessoal
✅ Admin da Empresa A NÃO vê agenda da Empresa B (isolamento multi-tenant)
```

**Lembretes de sequência**
```
✅ Quando uma etapa do tipo Lembrete atinge o prazo, o item aparece na Agenda do atendente responsável
✅ Item aparece na seção correta (Hoje, Amanhã, Esta semana, Atrasados)
✅ Marcar lembrete como feito remove o item da Agenda
✅ Marcar lembrete como feito agenda automaticamente a próxima etapa da sequência (se houver)
✅ Última etapa da sequência marcada como feita conclui a sequência para aquele contato
✅ Adiar lembrete 1 dia reagenda o item para o dia seguinte
✅ Adiar lembrete reaparece na data correta
```

**Follow-ups avulsos**
```
✅ Atendente cria follow-up avulso para um contato seu — aparece na Agenda na data correta
✅ Gerente cria follow-up avulso para qualquer contato do workspace
✅ Follow-up atrasado (data passada, não marcado) aparece na seção "Atrasados"
✅ Marcar follow-up avulso como feito remove o item da Agenda
❌ Atendente não consegue criar follow-up para contato que não é seu
```

**Reatribuição pelo Gerente**
```
✅ Gerente reatribui lembrete de um atendente para outro — o item muda de agenda
✅ Admin reatribui lembrete de um atendente para outro
❌ Atendente não consegue reatribuir lembrete para outro atendente
```

---

### Central de Alertas

Arquivo: `src/test/alertas-central.integration.test.ts`

```
✅ Atendente vê apenas alertas dos seus contatos
✅ Admin e Gerente veem alertas de todos os contatos do workspace
✅ Lead sem atividade acima do limiar configurado aparece como alerta "Lead sem resposta"
✅ Card em "Aguardando Recompra" acima do limiar aparece como alerta "Cliente sem recompra"
✅ Admin altera limiar de um tipo de alerta — recálculo inclui/exclui contatos corretamente
✅ Dispensar alerta remove o item da lista
✅ Alerta dispensado não reaparece até o limiar ser atingido novamente (após atividade que redefine o contador)
✅ Admin da Empresa A não vê alertas da Empresa B (isolamento multi-tenant)
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-4.spec.ts`

Simulam um usuário real no navegador. Executar com `npx playwright test`.

---

### Fluxo 1 — Admin cria sequência personalizada e atendente a executa

```
1. Loga como Admin
2. Acessa Configurações → Sequências
3. Clica em "Nova sequência"
4. Preenche nome "Pós-visita à loja" com gatilho Manual
5. Adiciona etapa 1: Lembrete, prazo 0 dias, instrução "Perguntar como foi a visita"
6. Adiciona etapa 2: Mensagem automática, prazo 2 dias, conteúdo "Oi {{nome_contato}}, tudo bem? Conseguiu analisar os produtos?"
7. Adiciona etapa 3: Lembrete, prazo 5 dias, instrução "Ligar para fechar pedido"
8. Salva a sequência — aparece na lista como Ativa
9. Abre o Perfil de um contato, clica em "Iniciar sequência" e seleciona "Pós-visita à loja"
10. Acessa a Agenda como Atendente responsável pelo contato
11. Verifica que o lembrete da etapa 1 aparece em "Hoje"
12. Marca como feito
13. Verifica que a próxima etapa (mensagem automática) foi agendada para 2 dias depois
```

---

### Fluxo 2 — Gatilho automático ao mover card para "Catálogo Enviado"

```
1. Loga como Admin
2. Confirma que a sequência "Pós-catálogo" está Ativa em Configurações → Sequências
3. Loga como Atendente com um card no Funil de Expansão
4. Move o card para a etapa "Catálogo Enviado"
5. Acessa a Agenda
6. Verifica que um lembrete da sequência "Pós-catálogo" aparece para o contato do card
7. Move o mesmo card de volta para "Em Qualificação" e depois novamente para "Catálogo Enviado"
8. Verifica que NÃO foi criada uma segunda sequência (idempotência)
```

---

### Fluxo 3 — RBAC da Agenda (cada vendedor vê apenas o seu)

```
1. Cria Atendente A e Atendente B no mesmo workspace
2. Inicia sequência manualmente para Contato X atribuído ao Atendente A
3. Inicia sequência manualmente para Contato Y atribuído ao Atendente B
4. Loga como Atendente A → vê apenas o lembrete do Contato X na Agenda
5. Loga como Atendente B → vê apenas o lembrete do Contato Y na Agenda
6. Loga como Gerente → acessa Visão da Equipe e vê os lembretes dos dois
7. Gerente reatribui o lembrete do Atendente A para o Atendente B
8. Loga como Atendente A → o lembrete não aparece mais na Agenda dele
9. Loga como Atendente B → o lembrete agora aparece na Agenda dele
```

---

### Fluxo 4 — Follow-up avulso: criação, adiamento e conclusão

```
1. Loga como Atendente
2. Acessa a Agenda
3. Clica em "Novo follow-up"
4. Busca pelo nome de um contato seu e seleciona
5. Define data para amanhã e nota "Confirmar se o pedido chegou"
6. Salva — item aparece na seção "Amanhã"
7. Clica em "Adiar" → seleciona "3 dias"
8. Verifica que o item some de "Amanhã" e aparece na data correta após 3 dias
9. Marca o follow-up como feito — item some da lista
10. Verifica que nenhuma nova etapa é agendada (follow-up avulso não tem sequência)
```

---

### Fluxo 5 — Central de Alertas: visualização e ação

```
1. Loga como Admin
2. Acessa a Central de Alertas
3. Verifica que o alerta "Lead sem resposta" aparece para leads parados há mais de 3 dias
4. Filtra por tipo "Lead sem resposta" — apenas alertas desse tipo aparecem
5. Clica em "Abrir conversa" em um alerta — é redirecionado para o Chat com a conversa do contato aberta
6. Volta à Central de Alertas
7. Clica em "Iniciar sequência" em outro alerta — o modal de seleção abre com o contato já preenchido
8. Seleciona a sequência "Qualificação" e confirma
9. Clica em "Dispensar alerta" no alerta original — o item some da lista
10. Altera o limiar de "Lead sem resposta" de 3 para 7 dias
11. Verifica que alertas de leads parados há menos de 7 dias somem da lista
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Reutilizar as mesmas dos módulos anteriores (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-local>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-local>
```

### Mensagens automáticas via WhatsApp API

Para testes de envio de mensagens automáticas, usar stub/mock da função de envio do WhatsApp API — não bater na API real da Meta em ambiente de teste. O teste deve verificar que a função de envio foi chamada com os parâmetros corretos (número do contato, conteúdo com variáveis substituídas), não que a mensagem foi efetivamente entregue.

---

## 5. Ordem de implementação dos testes

Criar os testes junto com cada issue, nunca depois.

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (biblioteca e agenda UI mock) | Nenhum — apenas UI mock |
| Issue criar/editar sequência | Unit: schema de sequência e etapa; Integration: gestão por papel |
| Issue ativar/desativar sequência | Integration: status e efeito nos gatilhos |
| Issue iniciar sequência manualmente | Integration: início manual + idempotência |
| Issue gatilhos automáticos do pipeline | Integration: gatilhos + idempotência (CRÍTICO) |
| Issue cancelar sequência | Integration: cancelamento + histórico preservado |
| Issue lembretes na agenda | Unit: prazos; Integration: RBAC da agenda + marcar como feito |
| Issue follow-up avulso | Integration: criação + adiamento + conclusão |
| Issue reatribuição de lembrete | Integration: reatribuição por papel |
| Issue alertas automáticos | Unit: lógica de alerta; Integration: limiares e dispensa |
| Ao final do módulo | E2E: todos os 5 fluxos acima |
