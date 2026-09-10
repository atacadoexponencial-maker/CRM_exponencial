# Pesquisa Inicial — CRM Exponencial

> Documento de referência para o planejamento do produto. Não vai para o repositório.

---

## 1. O Método Atacado Exponencial

### A Equação Exponencial

> Escala = Entrada constante de novos revendedores + Alta recompra de revendedores ativos

### Premissas que diferenciam atacado do varejo

- Venda **consultiva**, não transacional — precisa de relacionamento
- Ciclo de venda **longo e racional** — o revendedor decide com a cabeça, não com o coração
- WhatsApp é o **canal principal** de conversão de novos clientes
- O comercial fecha a venda, o marketing apenas atrai
- **Time dividido em dois**: Expansão (novos) e Retenção (recompra)
- A primeira compra é só um teste — o lucro real está nas recompras
- **Qualifica primeiro, catálogo depois** — nunca o contrário
- Sell-out (ajudar o cliente a vender) é o que garante a recompra

### Jornada do cliente no atacado

```
Lead → Qualificação → Catálogo → Negociação → 1ª Compra → Onboarding → Ativo → Recompra
```

### Segmentação obrigatória da base

- Ativos, Inativos, Perdidos
- Novos entrando vs. recorrentes

---

## 2. Referência: Helena CRM (helenacrm.com)

| Área | Recursos |
|---|---|
| Chat | WhatsApp + Instagram + Messenger centralizados |
| Atendimento | Distribuição automática, chat interno entre equipes |
| Automação | Chatbot, sequências de cadência, agentes de IA |
| CRM | Funil de vendas, histórico unificado |
| Campanhas | Disparo em massa, mensagens agendadas |
| Grupos | Suporte a grupos WhatsApp via API Oficial |
| Pagamentos | Recebimento via WhatsApp |
| Integrações | API, N8N, Make, ERPs |
| White label | Revenda com marca própria |

---

## 3. Funcionalidades propostas

### MÓDULO 0 — Fundação (pré-requisito de tudo)

Base multi-tenant que sustenta todos os outros módulos.

**Multi-tenant**
- Cada empresa é um workspace completamente isolado
- Dados de empresas diferentes nunca se misturam

**Papéis**

| Papel | Atende conversas | Vê todas as conversas | Pode atribuir para |
|---|---|---|---|
| **Admin** | Sim (opcional) | Sim | Qualquer um |
| **Gerente** | Sim (opcional, auto-atribui) | Sim | Qualquer um |
| **Atendente** | Sim | Não (só as suas) | Atendentes do time + Gerente |

**Times**
- Expansão e Retenção são padrão e imutáveis
- Empresa pode criar e excluir times adicionais
- Atendente pode pertencer a múltiplos times
- Gerente tem visibilidade transversal (todos os times)

**Números WhatsApp**
- Até 4 números por empresa
- Por padrão um número serve Expansão e Retenção
- Possível separar: ex. número A → Expansão, número B → Retenção

---

### MÓDULO 1 — Chat (prioridade máxima)

O coração do sistema. Precisa ser tão bom quanto o WhatsApp Web.

- Caixa de entrada unificada de todas as conversas
- Suporte a todos os tipos de mensagem: texto, áudio, vídeo, imagem, documento, sticker, localização, contatos, enquetes
- Atribuição de conversa a vendedor (Expansão ou Retenção)
- Transferência entre vendedores
- Mensagens rápidas / templates aprovados
- Histórico completo da conversa
- Busca dentro da conversa
- Labels/etiquetas nas conversas
- Chat interno entre vendedores
- Indicador de leitura, status de envio
- Responder mensagem específica (reply)

---

### MÓDULO 2 — Pipeline de Vendas Atacado

O funil reflete exatamente a jornada do método.

**Funil de Expansão (novos clientes):**
```
Lead → Em Qualificação → Catálogo Enviado → Em Negociação → Primeira Compra
```

**Funil de Retenção (clientes ativos):**
```
Em Onboarding → Cliente Ativo → Aguardando Recompra → Recompra Realizada → Em Risco → Inativo → Perdido
```

Cada card do pipeline abre a conversa do WhatsApp diretamente.

---

### MÓDULO 3 — Gestão de Contatos

- Perfil completo: nome, WhatsApp, nicho, cidade, tipo (lojista, revendedor, empreendedor)
- Campo ICP: já revende o nicho ou é primeira vez?
- Histórico de compras + ticket médio
- Classificação automática: Ativo / Inativo / Perdido
- Tags livres + etiquetas do método
- Timeline de interações
- Observações do vendedor

---

### MÓDULO 4 — Sequências e Follow-up

Essenciais porque no atacado o lead esfria e precisa de nutrição.

- Sequência de qualificação (após primeiro contato)
- Sequência pós-catálogo (lead recebeu mas não respondeu)
- Sequência de onboarding (após primeira compra)
- Sequência de reativação (cliente inativo)
- Agendamento de follow-ups com lembrete para o vendedor
- Alertas: "Lead há X dias sem resposta"

---

### MÓDULO 5 — Dashboard de Métricas

As métricas que o método prega como obrigatórias.

- Total de leads entrando por semana/mês
- Taxa de conversão por etapa do funil
- Taxa de recompra
- % novos vs. recorrentes no faturamento
- Clientes ativos / inativos / perdidos
- Ticket médio de primeira compra
- Clientes em risco (ativos há muito tempo sem recompra)
- Performance por vendedor

---

### MÓDULO 6 — Grupos WhatsApp

Grupos são usados no método para:
- Comunidade VIP de leads em nutrição
- Grupo de clientes ativos (onboarding + sell-out)

Suporte a criação, gestão e envio em grupos via API Oficial.

---

### MÓDULO 7 — Campanhas

- Disparo para lista segmentada (ex: "todos os inativos há 30 dias")
- Disparo de lançamento de coleção (pré-venda para clientes ativos)
- Agendamento de envios

---

## 4. Fora do escopo inicial

Para começar simples e crescer com eficiência:

- IA / chatbot
- Pagamentos via WhatsApp
- Integração com Instagram/Messenger
- White label

---

## 5. Ordem de implementação

| Fase | Entrega |
|---|---|
| **0** | Fundação: multi-tenant, empresas, papéis, times, números |
| **1** | Chat WhatsApp + contatos básicos |
| **2** | Pipeline (funil Expansão + Retenção) |
| **3** | Segmentação de base + alertas |
| **4** | Sequências e follow-up |
| **5** | Dashboard de métricas |
| **6** | Grupos + campanhas |
