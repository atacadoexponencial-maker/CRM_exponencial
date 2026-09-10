# Spec: Módulo 1 — Chat

## Visão Geral

O Chat é o coração do CRM Exponencial. É onde acontece toda a comunicação com os clientes via WhatsApp — recebimento e envio de mensagens, atribuição de conversas aos vendedores, acompanhamento do atendimento e organização por etiquetas. O objetivo é ser tão fluido quanto o WhatsApp Web, mas com controle de time e visibilidade do gestor.

O público são os times comerciais de atacadistas: Admins e Gerentes que gerenciam o fluxo, e Atendentes que respondem as conversas atribuídas a eles.

**Fora do escopo desta versão:** chatbot, IA, campanhas em massa, grupos WhatsApp, stickers, enquetes, localização, contatos compartilhados.

---

## Páginas / Módulos

---

### Caixa de Entrada

**Descrição:** Tela principal do sistema após o login. Exibe a lista de conversas do workspace, com filtros por status, time e etiqueta. É o ponto de partida de todo o trabalho dos vendedores.

**Componentes:**
- Lista de conversas: foto/avatar do contato, nome, preview da última mensagem, horário, badge de não lidas, etiquetas aplicadas
- Filtro de status: Todas, Em espera, Em atendimento, Resolvidas
- Filtro de visibilidade: Minhas conversas, Meu time, Todas (Admin e Gerente veem "Todas"; Atendente vê apenas "Minhas" e "Meu time")
- Filtro por etiqueta
- Campo de busca de conversas
- Indicador de conversa não lida (bold + badge numérico)
- Indicador de conversa em espera (sem atribuição)

**Comportamentos:**
- Usuário visualiza a lista de conversas conforme seu papel (Atendente vê apenas conversas do seu time ou atribuídas a ele; Gerente/Admin veem todas)
- Usuário filtra conversas por status: Em espera, Em atendimento, Resolvidas
- Usuário filtra conversas por etiqueta
- Usuário busca conversa por nome de contato ou número de telefone
- Usuário clica em uma conversa e abre o painel de chat
- Sistema exibe badge com contagem de mensagens não lidas por conversa
- Sistema destaca em negrito as conversas com mensagens não lidas
- Nova mensagem recebida atualiza a conversa para o topo da lista em tempo real
- Nova conversa de número desconhecido aparece como "Em espera" na lista de todos (Admin/Gerente)

---

### Conversa

**Descrição:** Painel central onde o usuário lê o histórico e responde as mensagens de uma conversa. Abre ao clicar em uma conversa na caixa de entrada.

**Componentes:**
- Cabeçalho: nome do contato, número, status da conversa, botão de ações (atribuir, transferir, resolver, reabrir)
- Área de mensagens: histórico completo em ordem cronológica
- Indicadores de mensagem: ícone de enviado (✓), entregue (✓✓), lido (✓✓ azul), falhou (⚠)
- Balões de mensagem diferenciados: mensagens enviadas (direita), recebidas (esquerda), notas internas (cor diferente, visível apenas para a equipe)
- Suporte a tipos de mensagem recebidos: texto, imagem, vídeo, áudio, documento
- Campo de texto para digitar a mensagem
- Botão de anexar: imagem, vídeo, documento
- Botão de gravar áudio
- Botão de mensagens rápidas
- Botão de nota interna
- Botão de enviar
- Campo de busca dentro da conversa
- Painel lateral de informações do contato (abre ao clicar no nome do contato)

**Comportamentos:**
- Usuário lê o histórico completo de mensagens da conversa
- Usuário digita e envia mensagem de texto
- Usuário anexa e envia imagem
- Usuário anexa e envia documento (PDF, planilha, etc.)
- Usuário anexa e envia vídeo
- Usuário grava e envia mensagem de áudio
- Usuário visualiza imagem recebida em tamanho ampliado ao clicar
- Usuário faz download de documento recebido
- Usuário reproduz áudio recebido diretamente no chat
- Usuário responde uma mensagem específica (reply) passando o mouse sobre ela e clicando em "Responder"
- Mensagem de reply exibe um trecho da mensagem original acima do texto da resposta
- Usuário abre o seletor de mensagens rápidas e escolhe uma para preencher o campo de texto
- Usuário adiciona nota interna visível apenas para a equipe (não enviada ao cliente)
- Usuário busca texto dentro da conversa e o sistema destaca as ocorrências
- Sistema marca automaticamente as mensagens como lidas ao abrir a conversa
- Sistema exibe status de entrega e leitura de cada mensagem enviada
- Admin ou Gerente atribui a conversa a um atendente ou a si mesmo
- Atendente com conversa atribuída pode transferir para outro atendente do mesmo time
- Admin ou Gerente pode transferir conversa para qualquer atendente
- Usuário marca conversa como resolvida
- Usuário reabre conversa resolvida
- Conversa atribuída ao usuário logado é destacada visualmente como "minha"

---

### Contato Básico

**Descrição:** Painel lateral com as informações básicas do contato vinculado a uma conversa. Abre ao clicar no nome do contato no cabeçalho da conversa. Permite identificar e nomear contatos que chegaram como número desconhecido.

**Componentes:**
- Nome do contato (editável)
- Número de WhatsApp (somente leitura)
- Data do primeiro contato
- Etiquetas aplicadas ao contato
- Lista de conversas anteriores do mesmo contato (com link para abrir cada uma)

**Comportamentos:**
- Usuário visualiza as informações básicas do contato
- Usuário edita o nome do contato
- Sistema salva o nome e atualiza em todos os lugares onde o contato é exibido
- Usuário visualiza o histórico de conversas anteriores do mesmo contato
- Usuário clica em uma conversa anterior e navega para ela
- Novo número sem cadastro aparece como o número de telefone até ser nomeado

---

### Etiquetas

**Descrição:** Área de configuração onde o Admin cria e gerencia as etiquetas usadas para classificar conversas. As etiquetas são globais do workspace.

**Componentes:**
- Lista de etiquetas: nome, cor, quantidade de conversas com essa etiqueta
- Botão de criar nova etiqueta
- Ações por etiqueta: editar nome/cor, excluir

**Comportamentos:**
- Admin visualiza todas as etiquetas do workspace
- Admin cria nova etiqueta informando nome e escolhendo uma cor
- Admin edita o nome ou a cor de uma etiqueta existente
- Admin exclui uma etiqueta (as conversas que tinham essa etiqueta perdem a associação)
- Sistema exibe confirmação antes de excluir uma etiqueta
- Etiquetas criadas ficam disponíveis para todos os usuários do workspace aplicarem nas conversas

---

### Mensagens Rápidas

**Descrição:** Área de configuração onde o Admin cadastra textos prontos que os atendentes podem usar durante as conversas para agilizar o atendimento.

**Componentes:**
- Lista de mensagens rápidas: título (atalho) e preview do conteúdo
- Botão de criar nova mensagem rápida
- Ações por mensagem: editar, excluir

**Comportamentos:**
- Admin visualiza todas as mensagens rápidas do workspace
- Admin cria nova mensagem rápida informando título e conteúdo
- Admin edita o título ou conteúdo de uma mensagem rápida existente
- Admin exclui uma mensagem rápida
- Mensagens rápidas ficam disponíveis para todos os usuários do workspace usarem no chat
- Usuário abre o seletor de mensagens rápidas durante o atendimento (botão no campo de texto)
- Usuário busca uma mensagem rápida por título dentro do seletor
- Usuário seleciona uma mensagem rápida e o conteúdo preenche o campo de texto (podendo editar antes de enviar)
