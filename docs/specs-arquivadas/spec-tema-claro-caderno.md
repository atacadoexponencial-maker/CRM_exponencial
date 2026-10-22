# Spec: Tema claro e linguagem visual Caderno

> série: B36
> estado: aprovada em 21/10/2026

## Visão Geral

O crmatacado exp hoje é sempre escuro. Esta mudança troca o visual do sistema inteiro:

1. **Dois temas, claro e escuro.** O **claro é o padrão**. Cada usuário escolhe o seu no
   menu do usuário, e a escolha fica guardada no perfil dele, valendo em qualquer
   computador ou celular em que ele entrar.
2. **A linguagem visual "Caderno" na cor Grafite**, aprovada pela Marcelle no quadro de
   design de 21/10/2026 (https://claude.ai/artifact/DmPtJQH7KX4yqfPsTTiXgd, linha A, cor
   Grafite). Ela vale para **todas as telas**, com cores, fontes e organização novas, e
   não só para três delas.
3. **O Dashboard ganha três blocos** que hoje não existem: "Para hoje", "Esperando
   resposta" e o funil de Entrada em barras. Os gráficos de hoje continuam, embaixo.

É para todos os usuários do CRM (Admin, Gerente e Atendente). Resolve dois problemas: o
tema escuro fixo cansa quem trabalha o dia inteiro em ambiente claro, e o visual atual
tem cara de modelo pronto, sem identidade. A aprovação visual é feita pela Marcelle, de
uma vez, num endereço de preview com a empresa de teste, antes de ir para o ar.

Decisões da Marcelle em 21/10/2026:

- tema claro padrão; escuro como opção de cada usuário;
- escolha guardada no perfil do usuário; troca pelo menu do usuário;
- organização nova em **todas** as telas, não só no Dashboard, no Pipeline e no Chat;
- Dashboard: juntar os blocos do quadro com os gráficos de hoje;
- loja pública do catálogo: visual de hoje, só claro, sem seguir o tema do vendedor;
- o item do menu continua se chamando "Dashboard";
- logo escura: ela já tem o arquivo (`Logo crmatacado exp em grafite1.png`, grafite em
  fundo transparente).

### A paleta

| Papel | Claro | Escuro |
|---|---|---|
| Fundo da página | #F6F4EF (papel) | #171714 |
| Menu lateral | #EFECE4 | #1D1D19 |
| Superfície (caixas, campos, balões recebidos) | #FBFAF7 | #201F1B |
| Texto | #1C1B18 | #EDEAE2 |
| Texto secundário | #6B675E | #9C978B |
| Linhas e bordas | #DDD8CC | #33312B |
| Destaque (botão principal, item ativo, marca) | #2B2A27 | #E6E2D8 |
| Fundo do item ativo e do balão enviado | #E6E2D8 | #2E2C27 |
| Alta (número que subiu) | #17694F | #5DBB97 |
| Queda (número que caiu, atraso) | #A3361F | #EE8A70 |
| Aviso (crachá de pendência) | texto #8A4B0C sobre #F6E3C8 | texto #F0B46A sobre #3A2B17 |

Fontes: **IBM Plex Sans** para o texto e **IBM Plex Mono** para números (valores, contagens,
horários, datas curtas).

## Páginas / Módulos

### Tema: escolha e aplicação

**Descrição:** Cada usuário vê o sistema no tema que escolheu. Quem nunca escolheu vê o claro.

**Componentes:**
- Opção de tema no menu do usuário: duas opções, "Claro" e "Escuro", com a atual marcada.

**Comportamentos:**
- Abrir o sistema sem ter escolhido tema: tudo aparece no claro.
- Trocar o tema no menu do usuário: a tela muda na hora, sem recarregar e sem perder o que
  estava aberto (conversa, filtro, formulário pela metade).
- Entrar em outro computador ou celular: o tema escolhido vem junto.
- Abrir ou recarregar qualquer tela: ela já nasce no tema escolhido, sem piscar o outro tema
  antes.
- Dois usuários no mesmo computador: cada um vê o seu tema depois de entrar.

**Critérios de aceite:**

#### CA-B36-01 — Quem nunca escolheu vê o tema claro · prova: automática

- **Dado** um usuário que nunca trocou o tema
- **Quando** ele entra no sistema
- **Então** todas as telas aparecem no tema claro (fundo de papel #F6F4EF, texto #1C1B18)

#### CA-B36-02 — Trocar o tema muda a tela na hora e guarda a escolha · prova: automática

- **Dado** um usuário no tema claro, com uma conversa aberta no Chat
- **Quando** ele escolhe "Escuro" no menu do usuário
- **Então** a tela passa para o escuro sem recarregar, a conversa continua aberta e a
  escolha fica gravada no perfil dele

#### CA-B36-03 — O tema acompanha o usuário em outro aparelho · prova: automática

- **Dado** um usuário que escolheu "Escuro"
- **Quando** ele entra por outro navegador, sem nada guardado
- **Então** o sistema aparece no escuro

#### CA-B36-04 — A tela já nasce no tema certo, sem piscar · prova: automática

- **Dado** um usuário que escolheu "Escuro"
- **Quando** ele recarrega qualquer tela do sistema
- **Então** a primeira pintura da página já é escura (o HTML chega do servidor com o tema
  aplicado), sem um instante de tela clara antes

#### CA-B36-05 — Cada usuário vê o próprio tema · prova: automática

- **Dado** a Ana no escuro e o Caio no claro, usando o mesmo navegador
- **Quando** a Ana sai e o Caio entra
- **Então** o Caio vê o claro

### Páginas fora do sistema

**Descrição:** Login, cadastro, política de privacidade, termos de serviço, exclusão de dados
e a página de "não encontrado" ficam no tema claro, com a linguagem Caderno. A loja pública
do catálogo não muda.

**Comportamentos:**
- Abrir o login, o cadastro ou as páginas legais: aparecem no claro, com a logo escura.
- Abrir a loja pública do catálogo: aparece exatamente como hoje, sempre clara, qualquer que
  seja o tema escolhido pelo vendedor que mandou o link.

**Critérios de aceite:**

#### CA-B36-06 — Login, cadastro e páginas legais no claro · prova: automática

- **Dado** um visitante sem login
- **Quando** ele abre o login, o cadastro, a política de privacidade, os termos de serviço,
  a exclusão de dados ou uma página que não existe
- **Então** a página aparece no tema claro, com a logo escura

#### CA-B36-07 — A loja pública não muda · prova: automática

- **Dado** um vendedor que escolheu o tema escuro e está logado no mesmo navegador
- **Quando** ele abre a loja pública da empresa e a página de um produto
- **Então** a loja aparece clara, igual a hoje (mesmas cores, fontes e disposição)

### Logo e marca

**Descrição:** A marca aparece em grafite no claro e em branco no escuro.

**Comportamentos:**
- Ver a logo no menu lateral, na barra do celular, no login e no cadastro: a versão certa
  para o tema.

**Critérios de aceite:**

#### CA-B36-08 — A logo troca de versão com o tema · prova: automática

- **Dado** um usuário no claro
- **Quando** ele vê o menu lateral (e a barra do celular)
- **Então** a logo aparece em grafite; ao trocar para o escuro, aparece a logo branca de hoje

### Linguagem Caderno: regras que valem em todas as telas

**Descrição:** O conjunto de regras visuais do quadro aprovado, aplicado a tudo o que existe
dentro do sistema.

**Componentes:**
- Cores: a paleta da Visão Geral, nos dois temas.
- Fontes: IBM Plex Sans no texto; IBM Plex Mono em todo número que a pessoa compara (valores
  em reais, contagens, porcentagens, horários).
- Grupos de números: em faixa única separada por linhas finas (como o livro-caixa do quadro),
  no lugar de fileiras de cartões iguais.
- Listas e tabelas: linhas finas entre itens, sem caixas em volta de cada item.
- Abas: texto com sublinhado na aba ativa.
- Botão principal: grafite com texto claro (no escuro, claro com texto escuro).
- Avisos (atenção, erro, sucesso): fundo suave da cor e texto escuro da mesma cor no claro;
  fundo escuro da cor e texto claro no escuro.
- Gráficos: cores tiradas da paleta, legíveis nos dois temas.

**Comportamentos:**
- Ler qualquer texto em qualquer tela, nos dois temas.
- Ver se um número subiu ou caiu pela cor (verde ou vermelho), nos dois temas.
- Ver um aviso, um erro ou uma confirmação em qualquer tela, nos dois temas.

**Critérios de aceite:**

#### CA-B36-09 — Todo texto tem contraste para leitura, nos dois temas · prova: automática

- **Dado** a paleta dos dois temas
- **Quando** se mede o contraste de cada par texto/fundo usado no sistema (texto e texto
  secundário sobre fundo, menu e superfície; destaque sobre fundo; texto do botão principal;
  alta, queda e aviso sobre os fundos)
- **Então** todos os pares têm contraste de pelo menos 4,5:1

#### CA-B36-10 — Nenhum texto some no tema claro · prova: automática

- **Dado** o código de todas as telas do sistema
- **Quando** se procura cor de texto ou de fundo escrita direto, que não muda com o tema (como
  texto branco fixo ou texto colorido claro de aviso, que no fundo claro fica ilegível)
- **Então** não sobra nenhuma, fora as listadas como exceção de propósito (ex.: a loja pública)

#### CA-B36-11 — Avisos legíveis nos dois temas · prova: automática

- **Dado** um aviso de atenção, um de erro e um de sucesso
- **Quando** eles aparecem no claro e no escuro
- **Então** o texto de cada um tem contraste de pelo menos 4,5:1 com o próprio fundo

#### CA-B36-12 — Números nas fontes e cores certas · prova: automática

- **Dado** a faixa de números do Dashboard com um número que subiu e um que caiu
- **Quando** ela aparece
- **Então** os valores estão em IBM Plex Mono, o texto em IBM Plex Sans, a variação que subiu
  em verde (#17694F no claro) e a que caiu em vermelho (#A3361F no claro)

### Menu lateral

**Descrição:** O menu no estilo Caderno: marca no topo, itens com ícone, grupos com título
(sem título, Rotina, Automação, Configurações), crachá de pendência e o usuário no pé, com o
menu do usuário (onde fica a troca de tema).

**Comportamentos:**
- Ver em que tela está: o item ativo tem fundo destacado e texto em negrito.
- Ver pendências: Pedidos novos e Agenda atrasada mostram crachá com o número, como hoje.
- Recolher e expandir o menu, como hoje.
- No celular, abrir o menu pela barra do topo, como hoje.

**Critérios de aceite:**

#### CA-B36-13 — Menu com os mesmos itens e permissões de hoje · prova: automática

- **Dado** um Admin, um Gerente e um Atendente
- **Quando** cada um vê o menu
- **Então** cada um vê exatamente os itens que vê hoje, nos mesmos grupos, com os mesmos
  crachás, e o item da tela atual destacado

#### CA-B36-14 — Menu aprovado visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle olha o menu aberto, recolhido e no celular, nos dois temas
- **Então** ela aprova que ele segue o quadro (linha A, cor Grafite)

### Dashboard

**Descrição:** O Dashboard reorganizado como no quadro, com três blocos novos em cima e os
gráficos de hoje embaixo. Continua respeitando o que cada papel vê hoje (o Atendente vê só os
próprios números).

**Componentes:**
- Cabeçalho: dia da semana e data, saudação com o primeiro nome, filtros de hoje (período e
  atendente).
- Faixa de números: os números que o Dashboard já mostra hoje (receita, conversão, recompra e
  os demais), em faixa única, cada um com a variação sobre o período anterior quando houver.
- **Funil de Entrada em barras (novo):** uma barra por etapa do funil de Entrada, com a
  quantidade de cards; a última etapa em destaque; link "Abrir pipeline".
- **Para hoje (novo):** os itens da Agenda do dia e os atrasados, com a hora; os atrasados em
  vermelho, com o total de atrasados no título; marcar como feito direto ali.
- **Esperando resposta (novo):** as conversas em que o cliente mandou a última mensagem e
  ainda não teve resposta, da mais antiga para a mais nova, com nome, trecho da mensagem, time
  (Entrada ou Recompra) e há quanto tempo espera; link "Ir para o chat".
- Gráficos de hoje (leads por semana, distribuição da base e os demais), embaixo.

**Comportamentos:**
- Ver os números do período escolhido na faixa.
- Ver quantos cards há em cada etapa do funil de Entrada.
- Abrir o pipeline pelo link do funil.
- Ver as tarefas do dia e as atrasadas.
- Marcar uma tarefa como feita no bloco "Para hoje".
- Ver quem está esperando resposta e há quanto tempo.
- Abrir uma conversa clicando nela no bloco "Esperando resposta".
- Atendente: ver só os próprios cards, tarefas e conversas nos blocos novos.

**Critérios de aceite:**

#### CA-B36-15 — Faixa de números com os mesmos valores de hoje · prova: automática

- **Dado** uma empresa com vendas, leads e recompras no período
- **Quando** o Dashboard abre
- **Então** a faixa mostra os mesmos números que o Dashboard mostra hoje para o mesmo período
  e filtro

#### CA-B36-16 — Funil de Entrada em barras conta os cards por etapa · prova: automática

- **Dado** um funil de Entrada com 5 cards na primeira etapa, 3 na segunda e 0 na terceira
- **Quando** o Dashboard abre
- **Então** o bloco mostra todas as etapas do funil, na ordem, com 5, 3 e 0, e a barra de
  cada uma proporcional à maior

#### CA-B36-17 — "Para hoje" mostra o dia e os atrasados · prova: automática

- **Dado** um usuário com 2 tarefas atrasadas, 2 para hoje e 1 para amanhã na Agenda
- **Quando** o Dashboard abre
- **Então** o bloco mostra as 4 de ontem e de hoje (as atrasadas primeiro, em vermelho, com
  "2 atrasadas" no título) e não mostra a de amanhã

#### CA-B36-18 — Marcar como feita pelo "Para hoje" · prova: automática

- **Dado** uma tarefa no bloco "Para hoje"
- **Quando** o usuário a marca como feita
- **Então** ela sai do bloco e aparece como feita na Agenda, igual a marcar pela Agenda

#### CA-B36-19 — "Esperando resposta" lista quem está sem resposta · prova: automática

- **Dado** três conversas: uma em que o cliente mandou a última mensagem há 40 minutos, uma
  há 5 minutos e uma em que o vendedor respondeu por último
- **Quando** o Dashboard abre
- **Então** o bloco mostra as duas primeiras, a de 40 minutos antes, com o tempo de espera, e
  não mostra a respondida; clicar numa delas abre a conversa no Chat

#### CA-B36-20 — O Atendente vê só o que é dele nos blocos novos · prova: automática

- **Dado** um Atendente e cards, tarefas e conversas dele e de outro atendente
- **Quando** ele abre o Dashboard
- **Então** o funil, o "Para hoje" e o "Esperando resposta" mostram só os dele

#### CA-B36-21 — Gráficos de hoje continuam no Dashboard · prova: automática

- **Dado** a empresa de teste
- **Quando** o Dashboard abre
- **Então** todos os gráficos que o Dashboard mostra hoje continuam lá, abaixo dos blocos novos

#### CA-B36-22 — Dashboard aprovado visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre o Dashboard e a tela de performance, nos dois temas, no
  computador e no celular
- **Então** ela aprova que seguem o quadro (linha A, cor Grafite)

### Pipeline

**Descrição:** Funis de Entrada e Recompra no estilo Caderno: colunas separadas por linhas
finas, título da coluna com a quantidade e a soma do que os clientes dela já compraram, abas
Entrada/Recompra sublinhadas, cards com nome, cidade, total já comprado pelo cliente e há quanto
tempo o card está parado.

**Comportamentos:**
- Trocar entre Entrada e Recompra pelas abas.
- Ver a quantidade de cards e a soma do que os clientes de cada coluna já compraram.
- Ver, em cada card, há quanto tempo ele está parado na etapa; parado demais aparece em vermelho.
- Arrastar cards, abrir cards, filtrar por vendedor e criar negócio, como hoje.

**Critérios de aceite:**

#### CA-B36-23 — Coluna mostra quantidade e soma · prova: automática

- **Dado** uma etapa com 3 cards, de clientes que já compraram R$ 100, R$ 250 e nada
- **Quando** o pipeline abre
- **Então** o título da coluna mostra 3 e R$ 350, e cada card mostra o total já comprado pelo cliente

#### CA-B36-24 — Card mostra há quanto tempo está parado · prova: automática

- **Dado** um card que entrou na etapa atual há 4 dias e outro há 2 horas, com o limite de
  card parado da empresa em 3 dias
- **Quando** o pipeline abre
- **Então** o primeiro mostra "parado 4 dias" em vermelho e o segundo "há 2 h" em cinza

#### CA-B36-25 — Pipeline aprovado visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre os funis de Entrada e Recompra, arrasta um card e abre um card,
  nos dois temas, no computador e no celular
- **Então** ela aprova que segue o quadro e que tudo o que fazia antes continua funcionando

### Chat

**Descrição:** O Chat no estilo Caderno, em três colunas: lista de conversas com filtro por
abas, conversa aberta e ficha do cliente à direita (total comprado, pedidos, ticket médio,
última compra, etapa e etiquetas, com link para o perfil completo).

> **Mudou em 22/10/2026 (ajuste pedido pela Marcelle no preview):** a ficha do cliente
> fica **entre a lista e a conversa**, não à direita, e só abre quando a pessoa clica no
> nome do contato (não abre sozinha em tela larga).

**Comportamentos:**
- Filtrar conversas pelas abas (Minhas, Sem resposta, Todas e as que existem hoje).
- Ver na lista há quanto tempo cada conversa espera resposta; espera longa em vermelho.
- Ler e mandar mensagens, mídia e mensagens rápidas, como hoje.
- Ver a ficha do cliente ao lado da conversa.
- Abrir o perfil completo pela ficha.

**Critérios de aceite:**

#### CA-B36-26 — Ficha do cliente ao lado da conversa · prova: automática

- **Dado** um contato com 3 compras de R$ 1.000, R$ 2.000 e R$ 3.000, a última há 10 dias
- **Quando** a conversa dele é aberta
- **Então** a ficha mostra total comprado R$ 6.000, 3 pedidos, ticket médio R$ 2.000, última
  compra há 10 dias, a etapa atual e as etiquetas dele

#### CA-B36-27 — Chat aprovado visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre o Chat, filtra, abre conversas e manda mensagem, nos dois temas,
  no computador e no celular
- **Então** ela aprova que segue o quadro e que tudo o que fazia antes continua funcionando

### Demais telas

**Descrição:** Todas as outras telas do sistema são reorganizadas na linguagem Caderno, com o
mesmo conteúdo e as mesmas ações de hoje: grupos de números em faixa, listas com linhas
finas, abas sublinhadas, números em fonte mono, formulários com campos e botões no novo
estilo. A organização de cada uma segue as regras da linguagem Caderno; o desenho exato é
visto pela primeira vez no preview.

Telas, por grupo de aprovação:

- **Relatórios:** as cinco abas (Visão Geral, RFV, Coorte, Funil de clientes, Carteiras) e a
  performance por vendedor.
- **Contatos:** lista, perfil do contato e lixeira.
- **Catálogo:** produtos, produto, aparência, configurações, importar e pedidos.
- **Rotina:** agenda, agenda da equipe e alertas.
- **Sequências e campanhas:** biblioteca e editor de sequência; lista, editor em 3 etapas e
  relatório de campanha.
- **Automações:** lista, editor em fluxo e histórico.
- **Configurações:** usuários, times, WhatsApp (com ritmo e saúde do número), etiquetas,
  mensagens rápidas e templates.
- **Perfil** do usuário.
- **Telas de espera e de erro:** carregando, vazio e erro de cada tela.

**Comportamentos:**
- Fazer em cada tela tudo o que se faz hoje: nenhuma ação, campo, filtro ou informação some
  ou fica escondida.

**Critérios de aceite:**

#### CA-B36-28 — Nenhuma função some · prova: automática

- **Dado** os testes automáticos que o sistema já tem (de tela, de ponta a ponta e de regra)
- **Quando** eles rodam depois da mudança
- **Então** todos passam, ajustados só no que é aparência (nome de classe, cor, posição), nunca
  no que conferem de comportamento

#### CA-B36-29 — Relatórios aprovados visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre as cinco abas e a performance, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-30 — Contatos aprovados visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre a lista, um perfil e a lixeira, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-31 — Catálogo aprovado visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre as telas do catálogo e os pedidos, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-32 — Rotina aprovada visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre a agenda, a agenda da equipe e os alertas, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-33 — Sequências e campanhas aprovadas visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre a biblioteca e o editor de sequência, a lista, o editor e o
  relatório de campanha, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-34 — Automações aprovadas visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre a lista, o editor em fluxo e o histórico, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-35 — Configurações e Perfil aprovados visualmente · prova: manual

- **Dado** o preview com a empresa de teste
- **Quando** a Marcelle abre cada tela de configuração e o perfil, nos dois temas
- **Então** ela aprova o visual e confere que nada sumiu

#### CA-B36-36 — Páginas fora do sistema aprovadas visualmente · prova: manual

- **Dado** o preview
- **Quando** a Marcelle abre o login, o cadastro, as páginas legais e a loja pública
- **Então** ela aprova o visual das primeiras e confere que a loja está igual a hoje

### Preview para aprovação

**Descrição:** Tudo vai para um endereço de preview antes de ir para o ar, para a Marcelle
aprovar todas as telas de uma vez com a empresa de teste "[TESTE] Automações B11".

**Comportamentos:**
- Abrir o endereço de preview e entrar com o login da empresa de teste.
- Ver todas as telas com dados de teste suficientes para cada uma ter conteúdo.

**Critérios de aceite:**

#### CA-B36-37 — Preview com a empresa de teste pronta · prova: manual

- **Dado** a mudança publicada num endereço de preview
- **Quando** a Marcelle entra com o login da empresa de teste
- **Então** todas as telas abrem com conteúdo (contatos, cards, conversas, tarefas, vendas,
  campanhas, sequências e automações de teste), e nada vai para o ar antes da aprovação dela

## Fora de escopo

- Loja pública do catálogo: não muda e não ganha tema escuro.
- Opção "seguir o tema do sistema operacional" (automático): só existem Claro e Escuro.
- Escolha de cor de destaque pelo usuário ou pela empresa: a cor é o Grafite para todos.
- Funcionalidades novas além dos três blocos do Dashboard. As outras telas mudam de
  aparência e organização, não de função.
- Mensagens e e-mails enviados pelo sistema (WhatsApp, e-mail de convite): não mudam.
- Trocar o nome de itens do menu ou endereços de telas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-01 | Só existem duas opções de tema, Claro e Escuro, sem "automático pelo sistema" | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-02 | "Para hoje" usa a mesma fonte da Agenda do usuário (lembretes de sequência e follow-ups do dia e os atrasados); Admin e Gerente veem os próprios, não os da equipe | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-03 | "Esperando resposta" considera só conversas abertas em que a última mensagem é do cliente; Admin e Gerente veem as da empresa, o Atendente só as dele; mostra no máximo 5, com link para o Chat | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-04 | O funil em barras do Dashboard mostra o funil de Entrada, e o filtro de atendente do Dashboard vale para ele | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-05 | "Parado há" no card do pipeline conta desde que o card entrou na etapa atual; o limite para ficar vermelho é o de card parado que a empresa já configura nos Alertas (sem limite configurado, não fica vermelho) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-06 | A ficha do cliente no Chat usa as compras registradas do contato (a mesma fonte do perfil do contato e dos Relatórios) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-08 | A logo escura usada é `Logo crmatacado exp em grafite1.png` (horizontal, fundo transparente), da pasta Downloads da Marcelle | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-09 | O favicon (o "exp" sobre fundo escuro) não muda | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-10 | No funil de Entrada em barras, a etapa em destaque é Ganho (a última etapa de sucesso), e não Perdido, que é a última da lista | confirmada | Marcelle, 22/10/2026 |
| SUP-B36-11 | A faixa do topo do Dashboard mostra faturado (com o número de compras), ticket médio, novos leads e taxa de recompra, com a variação sobre o período anterior de mesmo tamanho; os outros números de hoje ficam nas seções de baixo | confirmada | Marcelle, 22/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-01 | A organização nova vale para quais telas? | respondida | Todas as telas (Marcelle, 21/10/2026) |
| PER-B36-02 | Onde fica guardada a escolha de tema? | respondida | No perfil do usuário (Marcelle, 21/10/2026) |
| PER-B36-03 | Onde a pessoa troca o tema? | respondida | No menu do usuário (Marcelle, 21/10/2026) |
| PER-B36-04 | Como ficam login, cadastro, páginas legais e loja pública? | respondida | Login, cadastro e legais no claro; a loja só no claro, com o visual de hoje (Marcelle, 21/10/2026) |
| PER-B36-05 | O Dashboard troca os gráficos de hoje pelos blocos do quadro? | respondida | Junta os dois: blocos novos em cima, gráficos de hoje embaixo (Marcelle, 21/10/2026) |
| PER-B36-06 | O item "Dashboard" do menu vira "Painel"? | respondida | Não, continua "Dashboard" (Marcelle, 21/10/2026) |
| PER-B36-07 | De onde vem a logo escura? | respondida | A Marcelle já tem o arquivo (21/10/2026); ver SUP-B36-08 |
| PER-B36-08 | O card do funil não tem valor do negócio: o que o card e a coluna mostram? | respondida | O total já comprado pelo cliente (compras registradas); a coluna soma esse total (Marcelle, 22/10/2026) |
