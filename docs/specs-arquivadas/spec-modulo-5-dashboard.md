# Spec: Módulo 5 — Dashboard de Métricas

## Visão Geral

O Dashboard é a visão gerencial do método atacado exponencial em números. Ele transforma os dados gerados pelos módulos anteriores (Pipeline, Contatos, Sequências) em métricas acionáveis: o gestor vê de relance se a máquina de entrada de leads está funcionando, se a taxa de recompra está saudável e quais vendedores precisam de suporte.

Todas as métricas são calculadas a partir dos dados já existentes no sistema — nenhum dado novo é inserido pelo usuário neste módulo.

**Público:**
- Admin e Gerente: visão completa de todos os dados do workspace, com filtro por período e por atendente
- Atendente: visão restrita às próprias métricas (seus leads, suas conversões, seus clientes)

**Fora do escopo desta versão:** exportação de relatórios em PDF/CSV, alertas por e-mail de metas, comparação entre períodos, projeções e forecasting.

---

## Páginas / Módulos

---

### Dashboard Geral

**Descrição:** Página principal do módulo, acessível pelo menu lateral. Exibe os KPIs estratégicos do negócio em um layout de cards de métricas e gráficos de tendência. É a primeira tela que o Admin e o Gerente veem ao querer entender a saúde do negócio.

**Componentes:**

**Barra de controles:**
- Seletor de período: Últimos 7 dias, Últimos 30 dias, Últimos 90 dias, Este mês, Este trimestre, Personalizado (intervalo de datas)
- Filtro por atendente (Admin e Gerente; Atendente não vê esse filtro)

**Seção "Entrada de Leads" (Funil de Expansão):**
- Card: Total de novos leads no período
- Card: Leads ativos no funil agora (excluindo "Primeira Compra")
- Gráfico de barras: leads criados por semana no período selecionado

**Seção "Conversão" (Funil de Expansão):**
- Card: Taxa de conversão geral (lead → primeira compra) no período
- Funil de conversão visual: percentual de contatos que passaram de cada etapa para a próxima (Lead → Em Qualificação → Catálogo Enviado → Em Negociação → Primeira Compra)

**Seção "Retenção" (Funil de Retenção):**
- Card: Total de clientes ativos agora (Em Onboarding + Cliente Ativo + Aguardando Recompra + Recompra Realizada)
- Card: Taxa de recompra no período (Recompra Realizada ÷ total de clientes ativos no início do período)
- Card: Clientes em risco agora (etapa "Em Risco")
- Card: Clientes inativos agora (etapa "Inativo")
- Card: Clientes perdidos agora (etapa "Perdido")
- Gráfico de pizza ou donut: distribuição Ativo / Em Risco / Inativo / Perdido

**Seção "Receita" (dados do Módulo de Contatos):**
- Card: Total de compras registradas no período
- Card: Ticket médio de primeira compra (contatos que chegaram a "Primeira Compra" no período)
- Card: Ticket médio geral (todas as compras registradas no período)
- Card: % de faturamento de novos clientes vs. recorrentes no período

**Comportamentos:**
- Admin e Gerente visualizam todas as métricas do workspace
- Atendente visualiza apenas métricas dos contatos atribuídos a ele
- Usuário altera o período — todas as métricas e gráficos atualizam
- Admin ou Gerente filtra por atendente — métricas passam a refletir apenas os dados daquele atendente
- Métricas calculadas em tempo real a partir dos dados do banco (sem cache longo)
- Admin da Empresa A não vê dados da Empresa B (isolamento multi-tenant)

---

### Performance por Vendedor

**Descrição:** Página que detalha as métricas de cada atendente do workspace, permitindo ao gestor comparar desempenho e identificar quem precisa de suporte. Visível apenas para Admin e Gerente.

**Componentes:**
- Seletor de período (mesmo do Dashboard Geral)
- Tabela de atendentes com colunas:
  - Nome do atendente
  - Leads criados no período
  - Leads convertidos em primeira compra no período
  - Taxa de conversão individual
  - Clientes ativos sob sua responsabilidade
  - Clientes em risco sob sua responsabilidade
  - Recompras realizadas no período
  - Ticket médio das suas vendas
- Ordenação por qualquer coluna
- Clique em um atendente expande os detalhes com os mesmos cards da seção Dashboard Geral, mas filtrados para aquele atendente

**Comportamentos:**
- Admin ou Gerente visualiza a tabela com todos os atendentes do workspace
- Admin ou Gerente clica no cabeçalho de uma coluna para ordenar a tabela
- Admin ou Gerente clica em um atendente e expande o detalhe do atendente na mesma página
- Período selecionado na barra de controles se aplica a todos os dados da tabela
- Atendente não tem acesso a esta página
