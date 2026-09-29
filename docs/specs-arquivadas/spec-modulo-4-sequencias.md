# Spec: Módulo 4 — Sequências e Follow-up

## Visão Geral

No método atacado exponencial, o lead esfria rapidamente entre um contato e outro. O módulo de Sequências resolve esse problema com dois mecanismos complementares: **sequências automáticas** (séries de etapas pré-configuradas que o sistema executa após um gatilho) e **follow-ups manuais** (lembretes agendados pelo próprio vendedor para não esquecer de retomar uma conversa).

Uma sequência é composta por etapas que podem ser de dois tipos:
- **Mensagem automática**: o sistema envia a mensagem via WhatsApp API no prazo configurado, sem intervenção do vendedor.
- **Lembrete para o vendedor**: o sistema cria uma notificação na Agenda do vendedor indicando o que fazer. O vendedor executa a ação manualmente.

Existem quatro sequências pré-definidas pelo método, editáveis pelo Admin, e o workspace pode criar sequências personalizadas adicionais.

**Público:**
- Admin: cria, edita e desativa sequências e suas etapas; configura gatilhos automáticos e limiares de alerta
- Gerente: visualiza e gerencia sequências ativas dos atendentes do workspace; pode iniciar sequências manualmente
- Atendente: visualiza a própria Agenda de lembretes, marca lembretes como feitos, inicia sequências manualmente nos seus contatos

**Fora do escopo desta versão:** chatbot, IA, agendamento de campanhas em massa, integração com N8N ou Make, sequências de Instagram/Messenger.

---

## Sequências Pré-definidas

| Nome | Gatilho automático | Objetivo |
|---|---|---|
| **Qualificação** | Card criado no Funil de Expansão (etapa "Lead") | Nutrir o lead recém-chegado até ele estar pronto para receber o catálogo |
| **Pós-catálogo** | Card movido para "Catálogo Enviado" no Funil de Expansão | Reativar lead que recebeu o catálogo mas não respondeu |
| **Onboarding** | Card criado no Funil de Retenção (etapa "Em Onboarding") | Acompanhar o cliente na primeira compra até ele se tornar ativo |
| **Reativação** | Card movido para "Inativo" no Funil de Retenção | Tentar recuperar cliente que parou de comprar |

---

## Páginas / Módulos

---

### Biblioteca de Sequências

**Descrição:** Página de configuração acessível pelo menu de configurações (visível apenas para Admin e Gerente). Lista todas as sequências do workspace — as quatro pré-definidas e as personalizadas — com seus status (ativa ou inativa) e o número de contatos em execução no momento.

**Componentes:**
- Lista de sequências: nome, tipo (pré-definida ou personalizada), status (Ativa / Inativa), contagem de contatos com sequência em andamento, botão de editar
- Botão "Nova sequência" (somente Admin)
- Toggle para ativar ou desativar cada sequência (somente Admin)
- Badge visual diferenciando sequências pré-definidas de personalizadas

**Comportamentos:**
- Admin e Gerente visualizam todas as sequências do workspace
- Admin desativa uma sequência — novos gatilhos deixam de ativar a sequência; contatos com sequência em andamento completam a sequência normalmente
- Admin ativa uma sequência previamente desativada
- Admin clica em "Nova sequência" e é direcionado para o Editor de Sequência com formulário em branco
- Usuário clica em editar e é direcionado para o Editor de Sequência da sequência selecionada
- Sequências pré-definidas não podem ser excluídas, apenas editadas ou desativadas
- Sequências personalizadas podem ser excluídas se não tiverem nenhum contato em andamento
- Admin da Empresa A não vê sequências da Empresa B (isolamento multi-tenant)

---

### Editor de Sequência

**Descrição:** Formulário de criação e edição de uma sequência e suas etapas. Disponível apenas para Admin.

**Componentes:**
- Campo de nome da sequência
- Seletor de gatilho: Manual (inicia somente quando o vendedor pede) ou Automático (lista os gatilhos disponíveis: criação de card em Lead, movimentação para Catálogo Enviado, criação de card em Onboarding, movimentação para Inativo)
- Lista de etapas da sequência em ordem, com drag-and-drop para reordenar
- Cada etapa exibe: número da ordem, tipo (Mensagem automática ou Lembrete), prazo em dias após a etapa anterior (ou após o início, para a primeira etapa), preview do conteúdo
- Botão "Adicionar etapa"
- Formulário da etapa (modal ou painel lateral):
  - Tipo: Mensagem automática ou Lembrete para o vendedor
  - Prazo: número de dias após a etapa anterior (mínimo 0, que significa "mesmo dia")
  - Conteúdo: campo de texto com suporte a variáveis (ex: `{{nome_contato}}`, `{{nome_vendedor}}`)
  - (Apenas para Lembrete) Instrução para o vendedor: texto explicando o que fazer (ex: "Perguntar se o cliente já analisou o catálogo")
- Botão "Salvar sequência"
- Botão "Cancelar"

**Comportamentos:**
- Admin edita o nome, o gatilho e as etapas de uma sequência e salva
- Admin adiciona etapa nova no final da lista
- Admin reordena etapas via drag-and-drop — o sistema recalcula os prazos relativos
- Admin exclui uma etapa da sequência
- Admin usa variáveis no conteúdo da mensagem: `{{nome_contato}}` e `{{nome_vendedor}}` são substituídas automaticamente no momento do envio
- Sistema rejeita salvar sequência sem nome
- Sistema rejeita salvar sequência sem nenhuma etapa
- Sistema rejeita etapa de mensagem automática sem conteúdo
- Sistema rejeita etapa de lembrete sem instrução para o vendedor
- Sistema rejeita prazo negativo em qualquer etapa

---

### Ativação de Sequência (em contato/card)

**Descrição:** Ponto de entrada para iniciar uma sequência manualmente a partir do Perfil do Contato ou do Painel do Card no Pipeline. Não é uma página separada — é uma ação acessível nesses dois contextos.

**Componentes:**
- Botão "Iniciar sequência" no Perfil do Contato e no Painel do Card do Pipeline
- Modal de seleção: lista as sequências ativas disponíveis para o contato (com gatilho Manual ou Automático)
- Indicador de sequência ativa: se o contato já tem uma sequência em andamento, exibe o nome e a etapa atual com opção de cancelar
- Histórico de sequências concluídas ou canceladas para o contato (lista compacta)

**Comportamentos:**
- Atendente, Gerente ou Admin clica em "Iniciar sequência" e seleciona uma sequência ativa
- Sistema inicia a sequência para o contato, agendando a primeira etapa conforme o prazo configurado
- Sistema rejeita iniciar a mesma sequência duas vezes para o mesmo contato enquanto há uma execução em andamento
- Usuário cancela uma sequência em andamento para um contato — as etapas futuras são canceladas; etapas já executadas permanecem no histórico
- Quando um gatilho automático é disparado (ex: card movido para "Catálogo Enviado"), o sistema inicia a sequência correspondente automaticamente, sem intervenção do usuário
- Gatilho automático não inicia a sequência se ela já estiver em andamento para aquele contato
- Gatilho automático não inicia a sequência se a sequência estiver desativada

---

### Agenda do Vendedor

**Descrição:** Página pessoal de cada usuário, acessível pelo menu lateral, que centraliza todos os lembretes pendentes de sequências e os follow-ups avulsos agendados pelo próprio vendedor.

**Componentes:**
- Visão por data: lista de itens agrupados por "Hoje", "Amanhã", "Esta semana", "Atrasados"
- Cada item exibe: tipo (lembrete de sequência ou follow-up avulso), nome do contato, instrução ou nota, horário previsto, botão "Feito", botão "Adiar" (1 dia, 3 dias, 1 semana), botão "Abrir conversa"
- Contador de itens atrasados no topo da página e no badge do menu lateral
- Botão "Novo follow-up" para agendar um lembrete avulso em qualquer contato
- Formulário de novo follow-up: busca do contato, data, hora (opcional), nota livre

**Comportamentos:**
- Usuário visualiza apenas os lembretes e follow-ups atribuídos a ele
- Atendente vê somente seus próprios itens; Admin e Gerente veem os próprios (não a agenda dos atendentes — para isso existe a visão do Gerente, abaixo)
- Usuário marca um lembrete como feito — item sai da lista; o sistema agenda a próxima etapa da sequência automaticamente (se houver)
- Usuário adia um lembrete — novo prazo é registrado; o item reaparece na data selecionada
- Usuário clica em "Abrir conversa" e é redirecionado para a conversa de WhatsApp do contato no Chat
- Usuário cria follow-up avulso — aparece na Agenda na data selecionada
- Lembrete atrasado (data passada e não marcado como feito) aparece na seção "Atrasados" com destaque visual
- Sistema envia notificação (in-app) ao usuário quando um lembrete atinge o horário configurado

---

### Visão do Gerente (Agenda da Equipe)

**Descrição:** Painel disponível para Admin e Gerente que exibe o estado das sequências ativas e follow-ups de todos os atendentes do workspace. Não substitui a Agenda pessoal — é uma camada de supervisão.

**Componentes:**
- Filtro por atendente
- Lista de lembretes e follow-ups pendentes de toda a equipe, com indicação do atendente responsável
- Contador de itens atrasados por atendente
- Lista de sequências em andamento no workspace: nome da sequência, contato, atendente responsável, etapa atual, data da próxima etapa

**Comportamentos:**
- Admin ou Gerente visualiza todos os lembretes e follow-ups pendentes do workspace (ou filtrados por atendente)
- Admin ou Gerente visualiza todas as sequências ativas em andamento no workspace
- Admin ou Gerente reatribui um lembrete ou follow-up de um atendente para outro
- Admin da Empresa A não vê agenda da Empresa B (isolamento multi-tenant)

---

### Central de Alertas

**Descrição:** Painel que exibe alertas automáticos gerados pelo sistema quando um lead ou cliente atinge o limiar de dias sem atividade configurado pelo Admin. Acessível pelo menu lateral.

**Componentes:**
- Lista de alertas ativos: nome do contato, etapa atual no pipeline, dias sem atividade, atendente responsável
- Filtro por tipo de alerta: lead sem resposta, cliente ativo sem recompra, cliente inativo
- Botão "Dispensar alerta" por item
- Botão "Abrir conversa" por item
- Botão "Iniciar sequência" por item (atalho para iniciar uma sequência de reativação)
- Seção de configuração de limiares (somente Admin): número de dias sem atividade que dispara cada tipo de alerta

**Limiares padrão (configuráveis):**

| Tipo de alerta | Critério padrão |
|---|---|
| Lead sem resposta | Lead no Funil de Expansão sem nenhuma mensagem recebida ou enviada há 3 dias |
| Cliente sem recompra | Card em "Aguardando Recompra" no Funil de Retenção há mais de 30 dias |
| Cliente em risco | Card em "Em Risco" no Funil de Retenção há mais de 7 dias |
| Cliente inativo | Card em "Inativo" no Funil de Retenção há mais de 15 dias |

**Comportamentos:**
- Usuário visualiza alertas relevantes para seus contatos (Atendente vê apenas os seus; Admin e Gerente veem todos)
- Usuário dispensa um alerta — o alerta some da lista e não é gerado novamente até o limiar ser atingido novamente
- Usuário clica em "Abrir conversa" e é redirecionado para o Chat
- Usuário clica em "Iniciar sequência" e o modal de seleção de sequência abre com o contato já preenchido
- Admin altera o limiar de dias de qualquer tipo de alerta — o novo limiar é aplicado imediatamente para calcular os alertas ativos
- Sistema recalcula alertas automaticamente a cada hora (sem necessidade de refresh manual)
- Admin da Empresa A não vê alertas da Empresa B (isolamento multi-tenant)
