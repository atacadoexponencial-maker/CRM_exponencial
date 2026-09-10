# Spec: Módulo 6 — Grupos WhatsApp

## Visão Geral

No método atacado exponencial, grupos de WhatsApp são ferramentas de nutrição em escala: o **grupo VIP de leads** mantém prospects aquecidos com conteúdo e o **grupo de clientes ativos** serve de canal de sell-out e onboarding. Diferente das conversas individuais do Módulo 1, grupos permitem enviar uma mensagem para múltiplos contatos simultaneamente dentro de um contexto de relacionamento.

Este módulo usa a **API Oficial Meta (WhatsApp Business API)** — o mesmo canal já utilizado pelo Chat. Grupos criados aqui aparecem no WhatsApp do número conectado ao workspace.

**Público:**
- Admin: cria grupos, gerencia membros, configura associação com times, encerra grupos
- Gerente: cria grupos, adiciona e remove membros, envia mensagens
- Atendente: envia mensagens nos grupos em que foi incluído pelo Admin ou Gerente

**Fora do escopo desta versão:** moderação automática, enquetes em grupos, silenciar participantes, grupos com mais de 1024 participantes (limite da API Oficial), integração com grupos criados fora do sistema (grupos pré-existentes no celular não são importados automaticamente).

---

## Páginas / Módulos

---

### Lista de Grupos

**Descrição:** Página principal do módulo, acessível pelo menu lateral. Exibe todos os grupos gerenciados pelo workspace, com acesso rápido ao detalhe de cada um.

**Componentes:**
- Lista de grupos: foto do grupo (gerada pela API do WhatsApp), nome do grupo, time associado (Expansão, Retenção ou Nenhum), quantidade de participantes, data da última mensagem enviada pelo workspace
- Filtro por time associado: Todos, Expansão, Retenção, Sem time
- Campo de busca por nome do grupo
- Botão "Novo grupo" (Admin e Gerente)
- Badge de tipo: "VIP Leads" (Expansão) ou "Clientes Ativos" (Retenção) como atalho visual

**Comportamentos:**
- Admin e Gerente visualizam todos os grupos do workspace
- Atendente visualiza apenas os grupos em que está incluído como participante do workspace
- Usuário busca grupo por nome
- Usuário filtra grupos por time associado
- Usuário clica em um grupo e navega para o Detalhe do Grupo
- Admin ou Gerente clica em "Novo grupo" e abre o formulário de criação
- Admin da Empresa A não vê grupos da Empresa B (isolamento multi-tenant)

---

### Detalhe do Grupo

**Descrição:** Página de um grupo específico. Exibe as mensagens enviadas pelo workspace ao grupo, a lista de participantes e as ações disponíveis.

**Componentes:**

**Área de mensagens:**
- Histórico de mensagens enviadas pelo workspace ao grupo (em ordem cronológica)
- Cada mensagem exibe: conteúdo, horário do envio, nome do atendente que enviou, status de entrega (enviado / entregue / parcialmente lido)
- Campo de texto para compor mensagem
- Botão de anexar: imagem, documento
- Botão de enviar

**Painel lateral de informações do grupo:**
- Nome do grupo (editável por Admin e Gerente)
- Foto do grupo (exibida, não editável pelo CRM — alteração feita diretamente no WhatsApp)
- Time associado: seletor (Expansão, Retenção, Nenhum) — editável por Admin
- Lista de participantes do workspace (atendentes adicionados como gestores do grupo no CRM)
- Lista de membros do grupo no WhatsApp (contatos externos — somente visualização)
- Botão "Adicionar participante do workspace" (Admin e Gerente)
- Botão "Remover participante do workspace" por atendente (Admin e Gerente)
- Botão "Adicionar membro ao grupo" — adiciona um contato cadastrado ao grupo via API (Admin e Gerente)
- Botão "Remover membro do grupo" — remove um contato do grupo via API (Admin e Gerente)
- Botão "Encerrar grupo" (somente Admin)

**Comportamentos:**
- Usuário visualiza o histórico de mensagens enviadas pelo workspace ao grupo
- Usuário digita e envia mensagem de texto para o grupo via API Oficial
- Usuário envia imagem ou documento para o grupo
- Admin ou Gerente edita o nome do grupo — a alteração é propagada para o WhatsApp via API
- Admin altera o time associado ao grupo — mudança reflete nos filtros da lista
- Admin ou Gerente adiciona um atendente do workspace como participante (gestor no CRM) — o atendente passa a ver o grupo na lista e pode enviar mensagens
- Admin ou Gerente remove um atendente do workspace do grupo
- Admin ou Gerente adiciona um contato cadastrado ao grupo via API — o contato passa a receber as mensagens do grupo no WhatsApp
- Admin ou Gerente remove um contato do grupo via API
- Admin clica em "Encerrar grupo" e confirma — o grupo é encerrado via API e some da lista (fica no histórico como encerrado)
- Sistema exibe mensagem de erro se a API do WhatsApp retornar falha em qualquer operação (envio, adição de membro, etc.)
- Atendente não incluído como participante do workspace não vê nem envia mensagens neste grupo

---

### Criação de Grupo

**Descrição:** Formulário de criação de um novo grupo de WhatsApp via API Oficial. Abre ao clicar em "Novo grupo" na Lista de Grupos.

**Componentes:**
- Campo de nome do grupo (obrigatório)
- Seletor de time associado: Expansão, Retenção, Nenhum
- Campo de busca e seleção de contatos do workspace para adicionar como membros iniciais (opcional)
- Campo de seleção de atendentes do workspace para incluir como participantes gestores (opcional)
- Botão "Criar grupo"
- Botão "Cancelar"

**Comportamentos:**
- Admin ou Gerente preenche o nome e clica em "Criar grupo" — o grupo é criado via API Oficial no número de WhatsApp do workspace
- Sistema rejeita criação sem nome
- Contatos selecionados como membros iniciais são adicionados ao grupo automaticamente na criação
- Atendentes selecionados passam a ver e gerenciar o grupo no CRM
- Após criação bem-sucedida, o usuário é redirecionado para o Detalhe do Grupo recém-criado
- Sistema exibe mensagem de erro se a API retornar falha na criação
