# Plano de Testes — Módulo 7: Campanhas

> Documento de referência para implementação dos testes automatizados do Módulo 7.
> Stack: Vitest (unit + integration) + Playwright (E2E)

---

## Contexto

O Módulo 7 implementa disparos de mensagem em massa para listas segmentadas de contatos via API Oficial Meta. Os testes mais críticos envolvem a lógica de segmentação (a lista de destinatários reflete exatamente os filtros aplicados), o RBAC (somente Admin e Gerente têm acesso), o agendamento (a campanha só é disparada na data/hora correta), o isolamento multi-tenant e o tratamento de falhas parciais (alguns contatos entregues, outros não). Chamadas à API real da Meta são substituídas por stubs.

**Prioridade máxima:** correção da segmentação, isolamento multi-tenant e tratamento de falhas parciais da API.

---

## 1. Unit Tests (Vitest)

### Schema de criação de campanha

Arquivo: `src/test/campanha-schema.test.ts`

```
✅ Aceita campanha com nome, pelo menos um filtro de segmentação e mensagem de texto
✅ Aceita campanha com mensagem do tipo imagem com arquivo
✅ Aceita campanha com mensagem do tipo documento com arquivo
✅ Aceita campanha sem filtro explícito (destinatários = todos os contatos do workspace)
❌ Rejeita campanha sem nome
❌ Rejeita campanha com mensagem de texto vazia
❌ Rejeita campanha de imagem sem arquivo
❌ Rejeita campanha de documento sem arquivo
❌ Rejeita agendamento com data no passado
```

### Substituição de variáveis na mensagem

Arquivo: `src/test/campanha-variaveis.test.ts`

```
✅ {{nome_contato}} é substituído pelo nome do contato destinatário para cada mensagem
✅ {{nome_vendedor}} é substituído pelo nome do atendente responsável pelo contato
✅ Contato sem atendente responsável: {{nome_vendedor}} é substituído por string vazia
✅ Contato sem nome: {{nome_contato}} é substituído pelo número de WhatsApp
✅ Múltiplas ocorrências da mesma variável são todas substituídas
✅ Variável desconhecida é mantida como está (não causa erro)
```

### Lógica de segmentação

Arquivo: `src/test/campanha-segmentacao.test.ts`

```
✅ Filtro por classificação "Ativo" retorna apenas contatos com card ativo no Funil de Retenção
✅ Filtro por tipo "Lojista" retorna apenas contatos do tipo Lojista
✅ Filtro por nicho retorna apenas contatos com aquele nicho
✅ Múltiplos filtros retornam a interseção (AND, não OR)
✅ Filtro de cidade por correspondência parcial (ex: "For" encontra "Fortaleza" e "Formosa")
✅ Sem filtros, todos os contatos do workspace são destinatários
✅ Contato de outro workspace nunca é incluído como destinatário
```

---

## 2. Integration Tests (Vitest)

Estes testes batem no Supabase real. Chamadas à API do WhatsApp são substituídas por stubs.

> **Importante:** cada teste deve criar dados próprios e limpar ao final.

---

### Acesso por Papel (CRÍTICO — RBAC)

Arquivo: `src/test/campanhas-rbac.integration.test.ts`

```
✅ Admin visualiza todas as campanhas do workspace
✅ Gerente visualiza todas as campanhas do workspace
✅ Admin cria campanha — sucesso
✅ Gerente cria campanha — sucesso
✅ Admin cancela campanha agendada
✅ Gerente cancela campanha agendada
❌ Atendente não consegue listar campanhas
❌ Atendente não consegue criar campanha
✅ Admin da Empresa A NÃO vê campanhas da Empresa B (isolamento multi-tenant)
```

### Segmentação de Destinatários

Arquivo: `src/test/campanhas-segmentacao.integration.test.ts`

```
✅ Campanha sem filtro inclui todos os contatos do workspace como destinatários
✅ Filtro por classificação "Ativo" gera lista correta de destinatários
✅ Filtro por tipo "Revendedor" gera lista correta
✅ Combinação de filtros (classificação + nicho) gera lista que é a interseção correta
✅ Filtro por tag retorna apenas contatos com aquela tag
✅ Filtro por atendente responsável retorna apenas contatos daquele atendente
✅ Contagem de destinatários exibida no Editor bate com a lista real gerada
✅ Contato de outro workspace nunca aparece na lista de destinatários
✅ Campanha com zero destinatários é rejeitada
```

### Criação e Rascunho

Arquivo: `src/test/campanhas-criacao.integration.test.ts`

```
✅ Usuário salva campanha como rascunho — persiste com status "Rascunho"
✅ Rascunho pode ser editado e resalvo múltiplas vezes
✅ Rascunho pode ser confirmado e agendado a partir de qualquer etapa do editor
✅ Campanha confirmada para envio imediato muda para status "Enviando"
✅ Campanha agendada muda para status "Agendada" com a data/hora correta registrada
❌ Agendamento com data no passado é rejeitado
```

### Envio e Status de Entrega

Arquivo: `src/test/campanhas-envio.integration.test.ts`

```
✅ Campanha "Enviando" dispara uma mensagem individual para cada destinatário (stub verifica número de chamadas)
✅ Variáveis são substituídas corretamente para cada destinatário
✅ Após envio completo, status muda para "Enviada"
✅ Relatório registra status individual por destinatário: Enviado, Entregue, Lido, Falhou
✅ Webhook de confirmação da API atualiza o status do destinatário individual corretamente
✅ Falha em um destinatário não interrompe o envio para os outros (falha parcial)
✅ Campanha concluída com falhas parciais tem status "Enviada" (não "Falhou")
✅ Relatório exibe separadamente os destinatários com falha
✅ "Reenviar para os que falharam" cria nova campanha com os mesmos dados e apenas os destinatários com falha
```

### Cancelamento

Arquivo: `src/test/campanhas-cancelamento.integration.test.ts`

```
✅ Campanha "Agendada" pode ser cancelada — status muda para "Cancelada"
✅ Campanha cancelada não é disparada na data/hora agendada
✅ Campanha "Rascunho" pode ser excluída
❌ Campanha com status "Enviando" não pode ser cancelada
❌ Campanha com status "Enviada" não pode ser cancelada
```

---

## 3. E2E Tests (Playwright)

Arquivo: `e2e/modulo-7.spec.ts`

Os testes E2E usam o stub da API do WhatsApp para simular respostas de sucesso.

---

### Fluxo 1 — Criar e enviar campanha de lançamento de coleção

```
1. Loga como Admin
2. Acessa a Lista de Campanhas
3. Clica em "Nova campanha"
4. Etapa 1: nomeia a campanha "Lançamento Coleção Inverno", filtra por classificação "Ativo"
5. Verifica a contagem de destinatários e a lista paginada
6. Avança para Etapa 2: escolhe tipo "Imagem com legenda", faz upload de uma imagem e escreve a legenda com {{nome_contato}}
7. Visualiza o preview da mensagem com variáveis substituídas por valores de exemplo
8. Avança para Etapa 3: seleciona "Enviar imediatamente"
9. Revisa o resumo e confirma
10. Verifica que a campanha aparece na lista com status "Enviando" e depois "Enviada"
11. Acessa o Relatório da campanha e verifica as métricas de entrega
```

---

### Fluxo 2 — Salvar como rascunho e retomar depois

```
1. Loga como Gerente
2. Inicia criação de campanha "Reativação Inativos Julho"
3. Configura filtro por classificação "Inativo" e avança para Etapa 2
4. Escreve a mensagem e clica em "Salvar como rascunho"
5. Sai da página e acessa a Lista de Campanhas
6. Verifica que a campanha aparece com status "Rascunho"
7. Clica na campanha para reabrir o Editor
8. Verifica que os dados da Etapa 1 e Etapa 2 estão preservados
9. Avança para Etapa 3, agenda para amanhã às 09:00 e confirma
10. Verifica que o status muda para "Agendada" com a data correta
```

---

### Fluxo 3 — Cancelar campanha agendada

```
1. Loga como Admin
2. Localiza uma campanha com status "Agendada" na lista
3. Clica em "Cancelar campanha"
4. Verifica que o modal de confirmação aparece com a mensagem correta
5. Confirma o cancelamento
6. Verifica que o status muda para "Cancelada"
7. Aguarda a data e hora de envio originais (simulada no stub) e verifica que nenhuma mensagem foi disparada
```

---

### Fluxo 4 — Reenvio para destinatários com falha

```
1. Configura stub da API para retornar falha para 2 dos N destinatários
2. Loga como Admin e dispara uma campanha para envio imediato
3. Aguarda a campanha ir para status "Enviada"
4. Acessa o Relatório da campanha
5. Verifica que os 2 destinatários com falha aparecem com status "Falhou"
6. Clica em "Reenviar para os que falharam"
7. Verifica que o Editor abre pré-preenchido com os mesmos dados e apenas os 2 destinatários com falha
8. Confirma o envio
9. Verifica que a nova campanha aparece na lista como uma campanha separada
```

---

### Fluxo 5 — RBAC: Atendente não tem acesso a campanhas

```
1. Loga como Atendente
2. Tenta acessar a página de Campanhas pelo menu
3. Verifica que a opção de menu não aparece para o Atendente
4. Tenta acessar diretamente pela URL
5. Verifica que é redirecionado ou recebe erro de permissão
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

Reutilizar o mesmo stub do Módulo 6. O stub deve:
- Registrar cada chamada de envio para que os testes possam verificar o número de disparos e os parâmetros
- Simular retorno de sucesso e de falha por destinatário de forma configurável por teste
- Simular o webhook de atualização de status (Entregue, Lido) com delay configurável

### Agendamento em testes

Para testar o disparo de campanhas agendadas sem esperar a data real, usar time-travel via `Date` mockado ou trigger manual da função de despacho no ambiente de teste. Nunca agendar campanhas para datas reais em testes automatizados.

---

## 5. Ordem de implementação dos testes

| Após implementar | Testes a criar |
|---|---|
| Issues prototype (UI mock do editor e lista) | Nenhum — apenas UI mock |
| Issue lógica de segmentação | Unit: lógica de segmentação; Integration: contagem de destinatários |
| Issue criação e rascunho | Unit: schema; Integration: persistência de rascunho + RBAC (CRÍTICO) |
| Issue agendamento | Integration: criação com status Agendada + rejeição de data no passado |
| Issue envio imediato | Unit: substituição de variáveis; Integration: envio + falha parcial |
| Issue webhook de status de entrega | Integration: atualização de status por destinatário |
| Issue cancelamento | Integration: cancelamento por status |
| Issue relatório + reenvio | Integration: relatório + criação de campanha de reenvio |
| Ao final do módulo | E2E: todos os 5 fluxos acima |
