# Spec: Navegação fluida

## Visão Geral

Hoje, quem usa o CRM sente uma trava de alguns segundos a cada clique no menu
lateral: a tela antiga fica parada, sem nenhuma reação, até a página nova
chegar pronta. A causa não é o navegador nem a conexão. É que cada página só
aparece depois que o servidor termina uma fila de 7 a 15 consultas feitas uma
atrás da outra, várias delas repetidas (quem é o usuário, qual o perfil dele),
com o servidor rodando num continente diferente do banco, e em alguns casos
fazendo trabalho de fundo enquanto a pessoa espera.

Esta spec descreve **a mudança**: o que o vendedor, o gerente e o admin passam
a ver ao navegar, e o que o sistema deixa de fazer no caminho. Vale para todas
as páginas dentro da área logada. Nenhuma funcionalidade nova entra; nenhuma
tela muda de conteúdo. Muda a sensação de resposta.

Quando esta mudança entrar no ar, mover este arquivo para
`docs/specs-arquivadas/`.

### Medida de sucesso

Com o banco praticamente vazio (situação atual), um clique no menu troca a tela
em menos de meio segundo na maior parte das vezes, e a pessoa vê uma reação
visual imediata em 100% dos cliques. Com dados reais, as listagens não crescem
sem limite.

## Páginas / Módulos

### Área logada (todas as páginas do menu)

**Descrição:** o conjunto de páginas acessíveis pelo menu lateral: Dashboard,
Performance, Chat, Pipeline (Expansão e Retenção), Agenda (minha e da equipe),
Alertas, Sequências, Campanhas, Contatos, Perfil e todas as Configurações.

**Componentes:**
- Menu lateral: lista de links, com badge de lembretes atrasados e nome do
  usuário. Não muda de aparência.
- Esqueleto de carregamento: uma versão "vazia" da página destino, com o
  mesmo título e a mesma estrutura de blocos, em tom neutro, exibida enquanto
  os dados não chegam. Um esqueleto genérico para a área logada e esqueletos
  próprios para as páginas mais pesadas (Chat, Pipeline, Dashboard, Alertas,
  Contatos, Agenda).
- Página com conteúdo: a página como é hoje, exibida quando os dados chegam.

**Comportamentos:**
- Clicar num item do menu troca a tela imediatamente para o esqueleto da
  página destino, sem esperar o servidor.
- Ver o menu lateral continuar visível e clicável durante o carregamento da
  página destino.
- Ver o item do menu destino ficar marcado como ativo assim que clicado, não
  só quando a página chega.
- Ver o esqueleto ser substituído pelo conteúdo real quando os dados chegam,
  sem piscar e sem saltos de layout.
- Passar o mouse sobre um item do menu prepara a página destino, de modo que
  o clique seguinte chega mais rápido.
- Clicar duas vezes no mesmo item do menu não dispara dois carregamentos.
- Recarregar a página (F5) mostra o esqueleto e depois o conteúdo, do mesmo
  jeito que um clique no menu.
- Usar o botão Voltar do navegador volta à página anterior com a mesma
  resposta imediata.
- Ver a página inteira, e não só um pedaço, quando o servidor demora mais que
  o normal: o esqueleto fica até o conteúdo chegar, nunca aparece uma tela
  quebrada ou em branco.
- Se a sessão expirou durante a navegação, ser levado ao login uma única vez,
  sem passar antes por um esqueleto que nunca completa.

### Servidor por trás de todas as páginas (o que o usuário não vê)

**Descrição:** o trabalho que cada página faz antes de responder. O usuário
não vê nada disto diretamente, mas é a maior parte do tempo de espera.

**Componentes:**
- Identidade da requisição: quem é o usuário logado e qual o perfil dele
  (papel, nome, empresa). Resolvido uma única vez por requisição e
  compartilhado por tudo que a página precisar.
- Porteiro (verificação de sessão em cada requisição): decide se a pessoa
  pode entrar ou vai para o login.
- Consultas de dados de cada página.

**Comportamentos:**
- A identidade do usuário é buscada no máximo uma vez por requisição, mesmo
  que a página e várias funções internas precisem dela.
- O perfil do usuário é buscado no máximo uma vez por requisição, pelo mesmo
  motivo.
- O porteiro só consulta a sessão em rotas que exigem login. Rotas públicas
  (login, cadastro, políticas, exclusão de dados, webhooks, crons) passam
  direto, sem consulta.
- O porteiro não roda para arquivos estáticos, fontes, imagens nem para as
  rotas de API que já validam a si mesmas (webhooks e crons).
- Consultas independentes entre si, dentro de uma mesma página, são feitas ao
  mesmo tempo, não em fila.
- O servidor que responde ao CRM roda na mesma região do banco de dados, para
  que cada consulta custe o mínimo de ida e volta.
- A consulta do menu lateral (papel, nome, lembretes atrasados) reaproveita a
  identidade já resolvida e não repete a busca do usuário.

### Chat

**Descrição:** caixa de entrada e conversa. Hoje é a página que mais consulta
o servidor antes de aparecer.

**Componentes:**
- Esqueleto do Chat: coluna de conversas com linhas vazias e painel de
  conversa em branco com a barra de digitação desenhada.
- Lista de conversas, painel de conversa, listas de atendentes, etiquetas e
  mensagens rápidas (como hoje).

**Comportamentos:**
- Ver o esqueleto do Chat imediatamente ao clicar em Chat.
- Ver a lista de conversas limitada às mais recentes (as 50 últimas por
  ordem de atividade), com as demais carregadas ao rolar até o fim da lista.
- Ver as listas auxiliares (atendentes, atendentes para transferência,
  etiquetas, mensagens rápidas) carregadas em paralelo, não uma depois da
  outra.
- Abrir o Chat com uma conversa indicada na URL continua abrindo essa
  conversa, mesmo que ela não esteja entre as 50 mais recentes.

### Pipeline (Expansão e Retenção)

**Componentes:**
- Esqueleto do Pipeline: colunas do funil com cards vazios.

**Comportamentos:**
- Ver o esqueleto do funil imediatamente ao clicar em Pipeline ou Retenção.
- Ver a lista de atendentes e os cards carregados em paralelo.
- Ver a busca de conversas dos cards feita numa consulta só, sem repetir a
  busca de usuário e perfil.

### Dashboard e Performance

**Componentes:**
- Esqueleto do Dashboard: cartões de métrica vazios e área de gráfico em
  branco.

**Comportamentos:**
- Ver o esqueleto imediatamente ao clicar em Dashboard ou Performance.
- Ver as métricas do período e o histórico carregados em paralelo.

### Alertas

**Componentes:**
- Esqueleto de Alertas: lista de cartões de alerta vazios.

**Comportamentos:**
- Ver o esqueleto imediatamente ao clicar em Alertas.
- Ver a configuração de limiares e as listas de cards e conversas carregadas
  em paralelo, sem repetir a busca de usuário e perfil em cada etapa.

### Contatos

**Componentes:**
- Esqueleto de Contatos: tabela com linhas vazias.

**Comportamentos:**
- Ver o esqueleto imediatamente ao clicar em Contatos.
- Ver a listagem limitada a uma página de contatos por vez (50), com
  paginação ou "carregar mais" para o restante.
- Buscar por nome ou telefone continua funcionando sobre todos os contatos,
  não só sobre a página exibida.

### Agenda (minha e da equipe)

**Descrição:** hoje, abrir a Agenda dispara o processamento de todas as
sequências vencidas de todas as empresas, incluindo envios de WhatsApp, antes
de mostrar a lista.

**Componentes:**
- Esqueleto da Agenda: lista de lembretes vazios agrupados por dia.

**Comportamentos:**
- Ver o esqueleto imediatamente ao clicar em Agenda.
- Abrir a Agenda não processa sequências nem envia mensagens. Esse trabalho
  fica exclusivamente com a rotina agendada já existente.
- Ver a lista de lembretes e as conversas ligadas a eles numa consulta
  paralela, sem repetir usuário e perfil.

### Sequências, Campanhas e Configurações

**Comportamentos:**
- Ver o esqueleto genérico imediatamente ao clicar em qualquer destas
  páginas.
- Abrir Sequências não recria nem confere sequências predefinidas a cada
  visita; essa conferência acontece uma vez por empresa e fica registrada.
- Abrir a página de WhatsApp carrega os três blocos (números, conexão Meta,
  canal direto) em paralelo, com usuário e perfil resolvidos uma vez só.

### Menu lateral — Mensagens Rápidas (correção lateral encontrada no check-up)

**Comportamentos:**
- Ver o item Mensagens Rápidas no menu apenas nos papéis que podem abri-lo
  (hoje só admin consegue; os outros são redirecionados ao clicar).
- Como admin, abrir Mensagens Rápidas funciona mesmo quando o admin consegue
  ver mais de um perfil da empresa.

## Fora de escopo

- Cache entre requisições ou entre usuários. Cada requisição continua
  buscando dados frescos; o que muda é não repetir dentro da mesma
  requisição.
- Mudança de conteúdo, layout ou textos de qualquer página.
- Tempo real, notificações ou qualquer funcionalidade nova.
- Otimizações de tamanho de bundle no navegador (o check-up mostrou que não é
  o gargalo).
