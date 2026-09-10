# Spec: Módulo 2 — Pipeline de Vendas Atacado

## Visão Geral

O Pipeline é onde os times de vendas acompanham o progresso de cada lead e cliente dentro do método atacado exponencial. São dois funis distintos: o **Funil de Expansão**, para novos clientes que entram e precisam chegar à primeira compra, e o **Funil de Retenção**, para clientes ativos que precisam ser mantidos comprando.

Cada card do pipeline representa um contato em uma etapa da jornada. Clicar no card abre um painel com detalhes e acesso direto à conversa de WhatsApp. O pipeline é o "mapa de guerra" da equipe comercial — mostra de relance quem está em qual etapa e o que precisa ser feito.

**Público:**
- Admin e Gerente: visão completa de ambos os funis, de todos os atendentes
- Atendente: vê apenas os cards atribuídos a ele

**Fora do escopo desta versão:** automações, sequências automáticas de follow-up, disparos de campanha, dashboard de métricas.

---

## Páginas / Módulos

---

### Funil de Expansão

**Descrição:** Visão em kanban das etapas de prospecção de novos clientes. Cada coluna representa uma etapa da jornada do lead desde o primeiro contato até a primeira compra. É o funil do time de Expansão.

**Etapas (colunas, nesta ordem):**
1. Lead
2. Em Qualificação
3. Catálogo Enviado
4. Em Negociação
5. Primeira Compra

**Componentes:**
- Seletor de funil: aba "Expansão" e aba "Retenção" para navegar entre os dois funis
- Campo de busca de card por nome de contato ou número de telefone
- Filtro por atendente responsável (Admin e Gerente veem todos; Atendente não tem esse filtro)
- Colunas kanban: cada coluna exibe o nome da etapa e a contagem de cards nela
- Card: nome do contato, atendente responsável (ou "Sem atendente"), tempo na etapa atual, etiquetas aplicadas, ícone de atalho para a conversa de WhatsApp
- Botão "Novo lead" para adicionar um card manualmente ao funil
- Indicador visual diferenciado nos cards sem atendente atribuído

**Comportamentos:**
- Admin ou Gerente visualiza todos os cards do funil de Expansão do workspace
- Atendente visualiza apenas os cards atribuídos a ele no funil de Expansão
- Usuário busca card por nome de contato ou número de telefone
- Admin ou Gerente filtra cards pelo atendente responsável
- Usuário clica no card e abre o painel lateral de detalhes do card
- Usuário arrasta um card de uma coluna para outra para mudar de etapa
- Sistema registra data, hora e usuário responsável pela mudança de etapa ao mover um card
- Usuário clica no ícone de conversa do card e é redirecionado diretamente para a conversa de WhatsApp do contato no módulo de Chat
- Admin ou Gerente clica em "Novo lead", informa o contato (por número de WhatsApp ou nome já cadastrado) e cria o card na etapa "Lead"
- Admin ou Gerente atribui um card sem atendente a um atendente do workspace
- Admin ou Gerente reatribui um card de um atendente para outro
- Ao mover um card para a etapa "Primeira Compra", o sistema cria automaticamente um card correspondente no Funil de Retenção na etapa "Em Onboarding", vinculado ao mesmo contato
- Card movido para "Primeira Compra" permanece visível no Funil de Expansão como registro histórico (não é removido)

---

### Funil de Retenção

**Descrição:** Visão em kanban do ciclo de vida dos clientes ativos. Cada coluna representa um estado do relacionamento com o cliente após a primeira compra. É o funil do time de Retenção.

**Etapas (colunas, nesta ordem):**
1. Em Onboarding
2. Cliente Ativo
3. Aguardando Recompra
4. Recompra Realizada
5. Em Risco
6. Inativo
7. Perdido

**Componentes:**
- Seletor de funil: aba "Retenção" ativa, aba "Expansão" para navegar
- Campo de busca de card por nome de contato ou número de telefone
- Filtro por atendente responsável (Admin e Gerente veem todos; Atendente não tem esse filtro)
- Colunas kanban: cada coluna exibe o nome da etapa e a contagem de cards nela
- Card: nome do contato, atendente responsável (ou "Sem atendente"), tempo na etapa atual, etiquetas aplicadas, ícone de atalho para a conversa de WhatsApp
- Indicador visual diferenciado (cor de alerta) nos cards das colunas "Em Risco" e "Inativo"
- Indicador visual diferenciado (cor neutra/cinza) nos cards da coluna "Perdido"

**Comportamentos:**
- Admin ou Gerente visualiza todos os cards do funil de Retenção do workspace
- Atendente visualiza apenas os cards atribuídos a ele no funil de Retenção
- Usuário busca card por nome de contato ou número de telefone
- Admin ou Gerente filtra cards pelo atendente responsável
- Usuário clica no card e abre o painel lateral de detalhes do card
- Usuário arrasta um card de uma coluna para outra para mudar de etapa
- Sistema registra data, hora e usuário responsável pela mudança de etapa ao mover um card
- Usuário clica no ícone de conversa do card e é redirecionado para a conversa de WhatsApp do contato no Chat
- Admin ou Gerente atribui um card sem atendente a um atendente do workspace
- Admin ou Gerente reatribui um card de um atendente para outro
- Ao mover um card para "Recompra Realizada", o sistema move o card automaticamente para "Aguardando Recompra" após confirmação do usuário (indicando que o ciclo recomeça)
- Cards na coluna "Perdido" ficam visíveis mas são tratados como inativos no pipeline

---

### Painel do Card

**Descrição:** Painel lateral que abre ao clicar em qualquer card do pipeline. Exibe as informações do contato, histórico de movimentações, notas internas e acesso direto à conversa de WhatsApp. Funciona da mesma forma nos dois funis.

**Componentes:**
- Nome do contato e número de WhatsApp
- Etapa atual e funil atual (Expansão ou Retenção)
- Atendente responsável atual (com ação de reatribuir para Admin e Gerente)
- Tempo total no funil e data de entrada na etapa atual
- Histórico de etapas: lista cronológica de cada mudança de etapa com data e nome do usuário que moveu
- Etiquetas aplicadas ao contato (somente visualização; edição de etiquetas é na conversa do Chat)
- Lista de notas internas do card
- Campo para adicionar nova nota interna
- Botão "Abrir conversa" que navega para a conversa de WhatsApp do contato no Chat
- Botão de mover de etapa: dropdown com as etapas disponíveis do funil atual (alternativa ao drag-and-drop)
- Botão de fechar o painel

**Comportamentos:**
- Usuário visualiza as informações do contato e a etapa atual
- Usuário visualiza o histórico completo de mudanças de etapa, com data e responsável por cada movimentação
- Usuário clica em "Abrir conversa" e é redirecionado para a conversa de WhatsApp do contato no módulo de Chat
- Usuário muda a etapa do card pelo dropdown (mesmo efeito do drag-and-drop no kanban)
- Sistema registra a mudança de etapa ao confirmar pelo dropdown
- Usuário adiciona nota interna ao card (texto livre, visível apenas para o time)
- Notas internas exibem o nome do autor e a data de criação
- Admin ou Gerente altera o atendente responsável pelo card diretamente no painel
- Atendente não consegue reatribuir o card para outro atendente
- Usuário fecha o painel e retorna ao kanban sem perder a posição de scroll
