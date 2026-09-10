# Plano de Testes — Módulo 5: Dashboard de Métricas

> Documento de referência para implementação dos testes automatizados do Módulo 5.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 5 não armazena dados próprios — todas as métricas são calculadas a partir dos dados de Pipeline (Módulo 2), Contatos (Módulo 3) e Sequências (Módulo 4). Os testes mais críticos são os de cálculo das métricas (resultados corretos) e o RBAC (Atendente só vê os próprios dados, Empresas A e B são totalmente isoladas).

**Prioridade máxima:** correção dos cálculos de métricas e isolamento multi-tenant.

---

## 1. Unit Tests (Vitest)

### Cálculo de taxa de conversão do funil

Arquivo: `src/test/dashboard-conversao.test.ts`

```
✅ Taxa de conversão = 0% quando nenhum lead chegou à etapa final no período
✅ Taxa de conversão = 100% quando todos os leads do período chegaram à etapa final
✅ Taxa de conversão por etapa: percentual de contatos que avançaram de uma etapa para a próxima
✅ Contatos criados fora do período não entram no numerador nem no denominador
✅ Contato que voltou de etapa (regressão) não é contado como conversão daquela etapa
```

### Cálculo de taxa de recompra

Arquivo: `src/test/dashboard-recompra.test.ts`

```
✅ Taxa de recompra = Recompras realizadas no período ÷ clientes ativos no início do período
✅ Retorna 0 quando não há clientes ativos no início do período
✅ Retorna 0 quando nenhuma recompra foi realizada no período
✅ Clientes que entraram na base depois do início do período não compõem o denominador
```

### Cálculo de ticket médio

Arquivo: `src/test/dashboard-ticket.test.ts`

```
✅ Ticket médio de primeira compra considera apenas a primeira compra de cada contato
✅ Ticket médio geral considera todas as compras registradas no período
✅ Retorna 0 quando não há compras no período
✅ Compras registradas fora do período não entram no cálculo
```

### Cálculo de % novos vs. recorrentes

Arquivo: `src/test/dashboard-novos-recorrentes.test.ts`

```
✅ Faturamento de novos = soma das primeiras compras de contatos que fizeram primeira compra no período
✅ Faturamento de recorrentes = soma de compras de contatos que já tinham pelo menos uma compra antes do período
✅ Ambos somam 100% do total de faturamento do período
✅ Retorna 0/0 quando não há compras no período
```

### Filtragem por período

Arquivo: `src/test/dashboard-periodo.test.ts`

```
✅ "Últimos 7 dias" inclui eventos de hoje até 6 dias atrás
✅ "Últimos 30 dias" inclui eventos de hoje até 29 dias atrás
✅ Período personalizado inclui apenas eventos dentro do intervalo especificado (inclusivo nas duas pontas)
✅ Evento no primeiro dia do período é incluído
✅ Evento no último dia do período é incluído
✅ Evento fora do período não é incluído
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real (projeto de teste ou local via `supabase start`).

> **Importante:** cada teste deve criar dados próprios e limpar ao final. Nunca dependa de dados deixados por outro teste.

---

### Dashboard Geral — Visibilidade por Papel (CRÍTICO — RBAC)

Arquivo: `src/test/dashboard-rbac.integration.test.ts`

```
✅ Admin vê métricas de todos os atendentes do workspace
✅ Gerente vê métricas de todos os atendentes do workspace
✅ Atendente vê apenas métricas dos seus próprios contatos e cards de pipeline
✅ Atendente NÃO vê leads ou conversões de outro atendente
✅ Admin da Empresa A NÃO vê métricas da Empresa B (isolamento multi-tenant)
✅ Filtro por atendente retorna apenas os dados daquele atendente para Admin e Gerente
```

### Dashboard Geral — Cálculo das métricas com dados reais

Arquivo: `src/test/dashboard-metricas.integration.test.ts`

**Seção "Entrada de Leads"**
```
✅ Total de novos leads reflete exatamente os cards criados no Funil de Expansão no período
✅ Leads ativos no funil agora = cards no Funil de Expansão em etapas != "Primeira Compra"
✅ Gráfico de barras por semana reflete a distribuição correta de criação de cards
```

**Seção "Conversão"**
```
✅ Taxa de conversão geral = contatos em "Primeira Compra" ÷ total de leads criados no período
✅ Funil de conversão por etapa exibe os percentuais corretos para cada transição
✅ Contatos que entraram antes do período mas converterem no período são contados no numerador
```

**Seção "Retenção"**
```
✅ Clientes ativos = cards em Em Onboarding + Cliente Ativo + Aguardando Recompra + Recompra Realizada
✅ Clientes em risco = cards na etapa "Em Risco"
✅ Clientes inativos = cards na etapa "Inativo"
✅ Clientes perdidos = cards na etapa "Perdido"
✅ Distribuição do gráfico soma 100% do total de clientes que já chegaram ao Funil de Retenção
```

**Seção "Receita"**
```
✅ Total de compras no período reflete exatamente os registros de compra com data dentro do período
✅ Ticket médio de primeira compra é calculado corretamente
✅ % de novos vs. recorrentes é calculado corretamente
```

### Performance por Vendedor

Arquivo: `src/test/dashboard-vendedores.integration.test.ts`

```
✅ Tabela exibe um linha por atendente ativo do workspace
✅ Métricas de cada atendente refletem apenas os cards e compras atribuídos a ele
✅ Atendente sem nenhuma atividade no período aparece na tabela com zeros (não é omitido)
✅ Ordenação por coluna altera a ordem da tabela corretamente
✅ Expansão de detalhe de um atendente exibe os mesmos cards do Dashboard Geral filtrado para aquele atendente
✅ Atendente não tem acesso à página de Performance por Vendedor
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-5.spec.ts`

---

### Fluxo 1 — Dashboard reflete mudanças do pipeline em tempo real

```
1. Cria workspace com Admin e dois Atendentes, com dados de leads e clientes já inseridos
2. Loga como Admin e acessa o Dashboard
3. Anota o valor de "Total de novos leads" no período "Últimos 30 dias"
4. Abre outra aba, loga como Atendente e cria um novo card no Funil de Expansão
5. Volta ao Dashboard como Admin e atualiza a página
6. Verifica que o contador de novos leads aumentou em 1
7. O Atendente move o card para "Primeira Compra"
8. Admin atualiza o Dashboard e verifica que a taxa de conversão foi atualizada
```

---

### Fluxo 2 — RBAC: Atendente vê apenas as próprias métricas

```
1. Cria Atendente A (com 3 leads) e Atendente B (com 5 leads) no mesmo workspace
2. Loga como Atendente A e acessa o Dashboard
3. Verifica que o total de novos leads exibe 3 (apenas os do Atendente A)
4. Loga como Admin e acessa o Dashboard
5. Verifica que o total de novos leads exibe 8 (todos os leads)
6. Aplica filtro por Atendente B — verifica que exibe 5
7. Remove o filtro — volta a exibir 8
```

---

### Fluxo 3 — Filtro de período

```
1. Loga como Admin em workspace com leads distribuídos ao longo de 90 dias
2. Seleciona período "Últimos 7 dias" — verifica que o total reflete apenas os últimos 7 dias
3. Seleciona "Últimos 30 dias" — verifica que o número aumenta
4. Seleciona período personalizado cobrindo apenas um mês específico
5. Verifica que as métricas correspondem exatamente ao período selecionado
```

---

### Fluxo 4 — Performance por Vendedor

```
1. Loga como Gerente
2. Acessa a página de Performance por Vendedor
3. Verifica que a tabela exibe todos os atendentes do workspace
4. Ordena por "Taxa de conversão" — verifica que a ordem muda
5. Clica em um atendente para expandir os detalhes
6. Verifica que os dados do detalhe batem com os dados da linha da tabela
7. Tenta acessar a página como Atendente — verifica que é redirecionado ou recebe erro de permissão
```

---

## 4. Configuração necessária

### Variáveis de ambiente

Reutilizar as mesmas dos módulos anteriores (`.env.local`). Não há dependência de APIs externas.

### Dados de teste

Os testes de integração devem criar um conjunto fixo de cards e compras com datas controladas (não `NOW()`) para garantir que os cálculos de período funcionem corretamente. Use timestamps fixos no `afterEach` para não contaminar outros testes.

---

## 5. Ordem de implementação dos testes

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (UI mock do dashboard) | Nenhum — apenas UI mock |
| Issue cálculo de métricas de entrada de leads | Unit: filtro de período; Integration: contagem de leads por período |
| Issue cálculo de conversão do funil | Unit: taxa de conversão; Integration: funil com dados reais |
| Issue cálculo de retenção | Unit: taxa de recompra; Integration: contagem por etapa do Funil de Retenção |
| Issue cálculo de receita | Unit: ticket médio + % novos/recorrentes; Integration: compras por período |
| Issue filtro por atendente | Integration: RBAC (CRÍTICO) |
| Issue performance por vendedor | Integration: tabela por atendente |
| Ao final do módulo | E2E: todos os 4 fluxos acima |
