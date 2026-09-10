# Spec: Módulo 7 — Campanhas

## Visão Geral

Campanhas são disparos de mensagem para uma lista segmentada de contatos via WhatsApp API Oficial. No método atacado exponencial os dois casos de uso principais são: **lançamento de coleção** (mensagem para clientes ativos anunciando novos produtos) e **reativação em massa** (mensagem para inativos há X dias com oferta ou convite).

Diferente de uma sequência (que roda para um contato de cada vez ao longo de dias), uma campanha é um envio único, em massa, agendado para um momento específico. Cada mensagem é enviada individualmente para cada contato da lista — não é um grupo.

**Público:**
- Admin: cria, edita, agenda, cancela e visualiza todas as campanhas do workspace
- Gerente: cria, edita, agenda e cancela campanhas; visualiza relatórios
- Atendente: não tem acesso a campanhas

**Fora do escopo desta versão:** campanhas com múltiplas mensagens (sequência de campanha), teste A/B de mensagens, integração com ferramentas externas de e-mail marketing, campanhas de Instagram ou Messenger.

---

## Páginas / Módulos

---

### Lista de Campanhas

**Descrição:** Página principal do módulo, acessível pelo menu lateral (somente Admin e Gerente). Exibe todas as campanhas do workspace em qualquer estado.

**Componentes:**
- Lista de campanhas: nome, status (Rascunho, Agendada, Enviando, Enviada, Cancelada), total de destinatários, data de envio (agendada ou realizada), criador
- Filtro por status: Todas, Rascunho, Agendada, Enviadas, Canceladas
- Campo de busca por nome da campanha
- Botão "Nova campanha"

**Comportamentos:**
- Admin e Gerente visualizam todas as campanhas do workspace
- Usuário filtra campanhas por status
- Usuário busca campanha por nome
- Usuário clica em uma campanha com status Rascunho ou Agendada e abre o Editor de Campanha
- Usuário clica em uma campanha com status Enviada e abre o Relatório de Campanha
- Usuário clica em uma campanha Cancelada e visualiza os detalhes somente leitura
- Admin da Empresa A não vê campanhas da Empresa B (isolamento multi-tenant)

---

### Editor de Campanha

**Descrição:** Formulário de criação e edição de uma campanha. Dividido em três etapas sequenciais: Destinatários, Mensagem e Agendamento. Disponível para Admin e Gerente.

**Etapa 1 — Destinatários:**

**Componentes:**
- Campo de nome da campanha (obrigatório)
- Seletor de segmentação: combinação de filtros para definir quem recebe a campanha
  - Filtro por classificação: Lead, Ativo, Em Risco, Inativo, Perdido, Sem histórico (múltipla seleção)
  - Filtro por tipo: Lojista, Revendedor, Empreendedor (múltipla seleção)
  - Filtro por nicho: lista dos nichos existentes no workspace (múltipla seleção)
  - Filtro por cidade (texto livre, correspondência parcial)
  - Filtro por tag do contato
  - Filtro por atendente responsável
- Preview da lista de destinatários: contagem total de contatos que correspondem aos filtros + lista paginada com nome e número
- Botão "Próximo"

**Etapa 2 — Mensagem:**

**Componentes:**
- Tipo de mensagem: Texto, Imagem com legenda, Documento com legenda
- Campo de texto com suporte a variáveis: `{{nome_contato}}`, `{{nome_vendedor}}`
- Upload de arquivo (para imagem ou documento)
- Preview da mensagem renderizada com as variáveis substituídas por valores de exemplo
- Aviso se o conteúdo estiver fora das diretrizes da Meta (mensagem informativa, sem bloqueio automático)
- Botão "Anterior" e botão "Próximo"

**Etapa 3 — Agendamento:**

**Componentes:**
- Opção: Enviar imediatamente ou Agendar para uma data e hora específicas
- Seletor de data e hora (quando "Agendar" é escolhido)
- Número de WhatsApp pelo qual a campanha será enviada (seletor se o workspace tiver mais de um número conectado)
- Resumo da campanha: nome, total de destinatários, tipo de mensagem, data e hora do envio
- Botão "Salvar como rascunho"
- Botão "Confirmar e agendar" (ou "Confirmar e enviar agora")

**Comportamentos:**
- Usuário navega entre etapas — dados são preservados ao voltar à etapa anterior
- Contagem de destinatários atualiza em tempo real conforme os filtros de segmentação mudam
- Usuário visualiza a lista paginada de destinatários antes de confirmar
- Sistema rejeita avançar da Etapa 1 sem nome da campanha
- Sistema rejeita avançar da Etapa 1 com zero destinatários
- Sistema rejeita avançar da Etapa 2 sem conteúdo de mensagem
- Sistema rejeita avançar da Etapa 2 sem arquivo quando o tipo escolhido exige arquivo
- Usuário salva como rascunho em qualquer etapa — a campanha fica visível na lista com status "Rascunho"
- Usuário confirma e agenda — a campanha fica com status "Agendada" e o envio é disparado automaticamente na data/hora configurada
- Usuário confirma envio imediato — sistema inicia o envio e o status muda para "Enviando"
- Sistema envia as mensagens individualmente para cada destinatário via WhatsApp API (não em grupo)
- Após o término do envio, o status muda para "Enviada" e o Relatório fica disponível

---

### Relatório de Campanha

**Descrição:** Página de resultados de uma campanha já enviada. Exibe as métricas de entrega e leitura por destinatário.

**Componentes:**
- Cabeçalho: nome da campanha, data e hora do envio, total de destinatários
- Cards de resumo: Total enviado, Entregues, Lidos, Falhos
- Taxa de entrega (%) e taxa de leitura (%)
- Lista detalhada de destinatários com status individual: nome, número, status (Enviado, Entregue, Lido, Falhou), horário da última atualização de status
- Filtro da lista por status de entrega
- Botão "Reenviar para os que falharam" (cria nova campanha com os mesmos dados, pré-filtrada para os contatos com falha)

**Comportamentos:**
- Admin ou Gerente visualiza o relatório da campanha
- Status de entrega é atualizado em tempo real via webhook da API Oficial conforme as confirmações chegam
- Usuário filtra a lista por status de entrega para ver apenas os que falharam, por exemplo
- Usuário clica em "Reenviar para os que falharam" — abre o Editor de Campanha pré-preenchido com os mesmos dados e a lista de destinatários filtrada para os que tiveram falha
- Relatório de campanha cancelada exibe os destinatários que receberam antes do cancelamento e os que não receberam

---

### Cancelamento de Campanha Agendada

**Descrição:** Ação disponível na lista de campanhas e na tela de detalhe de uma campanha com status "Agendada". Não é uma página separada — é um modal de confirmação.

**Comportamentos:**
- Admin ou Gerente clica em "Cancelar campanha" em uma campanha Agendada
- Sistema exibe modal de confirmação: "Esta campanha ainda não foi enviada. Ao cancelar, nenhuma mensagem será disparada."
- Usuário confirma — o status muda para "Cancelada" e o envio agendado é removido
- Usuário cancela o modal — a campanha permanece Agendada
- Não é possível cancelar uma campanha com status "Enviando" (já em execução) ou "Enviada"
