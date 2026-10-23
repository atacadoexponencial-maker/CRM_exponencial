# Spec: Funis personalizados

> série: B41
> estado: aprovada em 23/10/2026

## Visão Geral

Hoje toda empresa tem dois funis fixos: **Entrada**, para quem ainda não comprou, e **Recompra**, para quem já comprou. Uma empresa que quer acompanhar outro processo em paralelo, como uma feira, um lançamento, uma ação com representantes ou uma pós-venda, não tem onde fazer isso.

Esta mudança deixa o Admin e o Gerente criarem funis da própria empresa, cada um com etapas próprias que eles nomeiam, ordenam, colorem e apagam. O contato pode estar em vários funis ao mesmo tempo, mas só uma vez em cada, como já acontece hoje com Entrada e Recompra.

Entrada e Recompra continuam como estão, com as mesmas etapas e as mesmas regras: o Ganho em Entrada abre o card em Recompra, as etapas iniciam sequências e definem a classificação do contato. Os funis novos são paralelos. Eles não mudam a classificação do contato, nem os relatórios, nem as sequências.

Os funis novos aparecem em todo lugar onde o funil já aparece:
- no quadro do Pipeline;
- na ficha do contato no chat e no perfil do contato;
- no filtro de contatos;
- nas automações;
- no aviso de card parado;
- no gráfico de funil do Dashboard.

## Páginas / Módulos

### 1. Gerenciar funis

**Descrição:** tela onde o Admin e o Gerente criam, editam e apagam os funis da empresa. Fica em Configurações → Funis, e também abre pelo botão "Gerenciar funis" no cabeçalho do Pipeline.

**Componentes:**
- **Lista de funis:** mostra Entrada e Recompra marcados como "fixo", sem editar nem apagar. Logo abaixo vêm os funis da empresa, com o nome, o número de etapas e o número de cards.
- **Editor do funil:** tem o nome do funil e a lista de etapas. Cada etapa tem nome, cor e "avisar parado depois de N dias", que é opcional. A cor pode ser uma das prontas ou uma própria, em "outra cor". Há botões para acrescentar etapa, subir e descer etapa e apagar etapa.
- **Confirmação de apagar etapa:** quando a etapa tem cards, pede a etapa de destino desses cards. Quando alguma automação usa a etapa, lista essas automações e avisa que elas serão desligadas.
- **Confirmação de apagar funil:** mostra quantos cards saem junto e lista as automações que serão desligadas.
- **Marca "precisa de ajuste":** aparece na lista de automações, na automação desligada porque o funil ou a etapa que ela usava foi apagado.

**Comportamentos:**
- Criar funil com nome e ao menos uma etapa.
- Renomear funil.
- Acrescentar etapa.
- Renomear etapa.
- Trocar a cor da etapa.
- Mudar a ordem das etapas.
- Definir ou tirar o prazo de "parado" da etapa.
- Apagar etapa vazia.
- Apagar etapa com cards, escolhendo para onde os cards vão.
- Apagar funil.
- Apagar funil ou etapa que uma automação usa, depois do aviso, e ver a automação desligada e marcada "precisa de ajuste".
- Corrigir a automação marcada e ligá-la de novo.
- Escolher cor pronta ou cor própria para a etapa.
- Ver Entrada e Recompra na lista, sem poder mexer.

**Critérios de aceite:**

#### CA-B41-01 — Admin cria um funil com etapas · prova: automática

- **Dado** um Admin na tela de funis
- **Quando** ele cria o funil "Feira de Março" com as etapas "Convidado", "Confirmou" e "Visitou o estande", nessa ordem
- **Então** o funil aparece na lista com 3 etapas e 0 cards, e o Pipeline ganha a aba "Feira de Março" com essas três colunas, nessa ordem

#### CA-B41-02 — Gerente também cria e edita funis · prova: automática

- **Dado** um Gerente
- **Quando** ele cria um funil, renomeia o funil e acrescenta uma etapa
- **Então** as três mudanças ficam gravadas, como acontece para o Admin

#### CA-B41-03 — Atendente não gerencia funis · prova: automática

- **Dado** um Atendente
- **Quando** ele tenta abrir a tela de funis, ou criar, renomear ou apagar um funil ou uma etapa por qualquer caminho (inclusive direto no servidor)
- **Então** ele não vê a tela nem o botão "Gerenciar funis", e o servidor recusa toda tentativa sem mudar nada

#### CA-B41-04 — O nome do funil é obrigatório e não repete · prova: automática

- **Dado** a tela de funis
- **Quando** alguém tenta salvar um funil sem nome, ou com o nome de outro funil da empresa, ou com o nome "Entrada" ou "Recompra" (com qualquer variação de maiúscula e minúscula, ou espaço sobrando)
- **Então** a tela avisa o motivo e nada é criado

#### CA-B41-05 — O funil precisa de ao menos uma etapa, com nome · prova: automática

- **Dado** o editor do funil
- **Quando** alguém tenta salvar um funil sem etapas, ou com uma etapa sem nome, ou com duas etapas de mesmo nome no mesmo funil
- **Então** a tela avisa o motivo e nada é gravado. Também não dá para apagar a última etapa de um funil.

#### CA-B41-06 — Renomear o funil ou a etapa não mexe nos cards · prova: automática

- **Dado** um funil com cards na etapa "Confirmou", e uma automação que move cards para essa etapa
- **Quando** o Admin renomeia o funil para "Feira de Abril" e a etapa para "Confirmado"
- **Então** os cards continuam na mesma coluna, que agora se chama "Confirmado"; a aba passa a se chamar "Feira de Abril"; e a automação continua funcionando e já mostra os nomes novos

#### CA-B41-07 — Mudar a ordem das etapas muda a ordem das colunas · prova: automática

- **Dado** um funil com as etapas A, B e C
- **Quando** o Gerente sobe a etapa C para o topo
- **Então** o quadro mostra as colunas na ordem C, A, B, e os cards continuam nas etapas em que estavam

#### CA-B41-08 — Cor da etapa aparece na coluna · prova: automática

- **Dado** uma etapa de funil novo
- **Quando** o Admin escolhe para ela uma das cores prontas (a paleta de colunas que já existe), ou uma cor própria em "outra cor"
- **Então** a coluna dessa etapa no quadro aparece com essa cor. Uma cor que não é válida (texto que não é cor) é recusada.

#### CA-B41-42 — O texto da coluna continua legível com qualquer cor · prova: automática

- **Dado** etapas com cores próprias muito claras (como amarelo-claro) e muito escuras (como azul-marinho)
- **Quando** o quadro aparece no tema claro e no tema escuro
- **Então** o nome da etapa e a contagem de cards ficam com contraste de pelo menos 4,5:1 sobre a cor da coluna, nos dois temas (o sistema escolhe texto claro ou escuro sozinho)

#### CA-B41-09 — Apagar etapa com cards pede o destino · prova: automática

- **Dado** uma etapa com 4 cards, num funil que tem outras etapas
- **Quando** o Admin apaga a etapa e escolhe a etapa de destino
- **Então** os 4 cards passam para a etapa de destino, cada um com a mudança registrada no histórico do card, e a etapa some do funil. Se ele desiste na confirmação, nada muda.

#### CA-B41-10 — Apagar etapa vazia não pede destino · prova: automática

- **Dado** uma etapa sem cards
- **Quando** o Admin apaga a etapa
- **Então** ela some do funil sem nenhuma pergunta além da confirmação

#### CA-B41-11 — Apagar etapa ou funil em uso avisa e desliga a automação · prova: automática

- **Dado** uma automação, ligada ou desligada, que usa o funil "Feira de Março" ou uma das etapas dele, no gatilho, numa condição ou numa ação
- **Quando** alguém pede para apagar esse funil ou essa etapa
- **Então** a confirmação avisa e lista o nome das automações afetadas. Se a pessoa desiste, nada muda. Se confirma, o funil ou a etapa é apagado, e cada automação afetada fica desligada e marcada "precisa de ajuste" na lista de automações.

#### CA-B41-41 — Automação marcada "precisa de ajuste" só liga depois de corrigida · prova: automática

- **Dado** uma automação desligada porque o funil ou a etapa que ela usava foi apagado
- **Quando** alguém tenta ligá-la sem mudar nada, e depois escolhe outro funil ou outra etapa no bloco afetado e liga
- **Então** a primeira tentativa é recusada, com o aviso de qual bloco precisa de ajuste. Depois da correção, ela liga, e a marca "precisa de ajuste" some.

#### CA-B41-12 — Apagar funil leva os cards junto, depois de confirmar · prova: automática

- **Dado** um funil com 7 cards
- **Quando** o Admin pede para apagar
- **Então** a confirmação diz que 7 cards vão sair. Confirmado, o funil some da lista e do Pipeline, e os 7 cards saem com ele. Os contatos continuam existindo, e os cards que eles têm em outros funis ficam como estavam.

#### CA-B41-13 — Entrada e Recompra não mudam · prova: automática

- **Dado** a tela de funis
- **Quando** alguém olha Entrada e Recompra, ou tenta renomear, apagar ou mudar as etapas deles por qualquer caminho
- **Então** eles aparecem como "fixo", sem os botões de editar, e o servidor recusa toda tentativa. As etapas e as regras desses dois funis continuam iguais às de hoje.

#### CA-B41-14 — Cada empresa só vê os próprios funis · prova: automática

- **Dado** a empresa A com o funil "Feira de Março"
- **Quando** alguém da empresa B abre a tela de funis, o Pipeline, o filtro de contatos ou as automações, ou consulta direto o banco
- **Então** o funil da empresa A não aparece, e nenhuma tentativa de ler, mudar ou usar esse funil funciona

### 2. Quadro do funil novo (Pipeline)

**Descrição:** cada funil da empresa ganha uma aba no cabeçalho do Pipeline, ao lado de Entrada e Recompra. O quadro funciona como o de Entrada: colunas por etapa, cards arrastáveis, painel do card, busca e filtro de atendente.

**Componentes:**
- **Abas do cabeçalho:** Entrada, Recompra e os funis da empresa, por ordem de criação.
- **Colunas:** uma por etapa, na ordem e na cor definidas.
- **Botão "Adicionar contato":** só para Admin e Gerente. Escolhe um contato da empresa e cria o card na primeira etapa.
- **Painel do card:** contato, atendente, "mover para etapa" (só com as etapas desse funil), notas, histórico e excluir card.
- **Busca e filtro de atendente:** iguais aos do quadro de Entrada.

**Comportamentos:**
- Abrir o funil pela aba.
- Adicionar um contato ao funil.
- Arrastar um card de uma etapa para outra.
- Mover um card pelo painel.
- Atribuir ou trocar o atendente do card.
- Excluir o card do funil.
- Buscar card por nome ou telefone.
- Filtrar por atendente.
- Ver o card parado em vermelho.

**Critérios de aceite:**

#### CA-B41-15 — Adicionar contato cria o card na primeira etapa · prova: automática

- **Dado** um Gerente no quadro "Feira de Março" e um contato que não está nesse funil
- **Quando** ele adiciona o contato
- **Então** o card aparece na primeira etapa do funil, sem atendente, com "Card criado no funil Feira de Março" no histórico. Os cards que o contato tem em Entrada ou Recompra não mudam.

#### CA-B41-16 — O contato não entra duas vezes no mesmo funil · prova: automática

- **Dado** um contato que já tem card em "Feira de Março"
- **Quando** alguém tenta adicioná-lo de novo, pela tela ou direto no servidor
- **Então** a tela avisa que ele já está nesse funil e nenhum card novo é criado. Adicioná-lo a outro funil da empresa continua possível.

#### CA-B41-17 — Atendente não adiciona contato ao funil · prova: automática

- **Dado** um Atendente no quadro de um funil novo
- **Quando** ele olha o cabeçalho, ou tenta criar o card direto no servidor
- **Então** o botão "Adicionar contato" não aparece, e o servidor recusa

#### CA-B41-18 — Arrastar e mover o card só entre etapas do mesmo funil · prova: automática

- **Dado** um card em "Convidado" no funil "Feira de Março"
- **Quando** alguém arrasta o card para "Confirmou", ou escolhe a etapa em "mover para etapa" no painel
- **Então** o card fica em "Confirmou", com a mudança no histórico. O painel só oferece as etapas desse funil, e o servidor recusa mover o card para uma etapa de outro funil.

#### CA-B41-19 — Atendente vê só os próprios cards no funil novo · prova: automática

- **Dado** um funil novo com cards de dois atendentes e cards sem atendente
- **Quando** um dos atendentes abre o quadro
- **Então** ele vê só os cards em que é o atendente, como acontece em Entrada e Recompra. O Admin e o Gerente veem todos.

#### CA-B41-20 — Atribuir e excluir card no funil novo · prova: automática

- **Dado** um card de funil novo
- **Quando** o Gerente atribui o card a um atendente e depois exclui o card
- **Então** o atendente passa a ver o card enquanto ele existe. Excluído, o card some só desse funil, e o contato e os outros cards dele continuam.

#### CA-B41-21 — Busca e filtro de atendente no funil novo · prova: automática

- **Dado** um funil novo com cards de vários contatos e atendentes
- **Quando** o Admin busca por parte do nome ou do telefone, ou escolhe um atendente
- **Então** o quadro mostra só os cards que batem com a busca ou com o atendente escolhido

#### CA-B41-22 — Card parado segue o prazo da etapa · prova: automática

- **Dado** a etapa "Confirmou" com prazo de 3 dias e a etapa "Convidado" sem prazo
- **Quando** um card fica 4 dias em cada uma delas
- **Então** o card em "Confirmou" aparece como parado (em vermelho, como em Entrada), e o card em "Convidado" nunca fica parado

#### CA-B41-23 — Funil sem nenhum card · prova: automática

- **Dado** um funil recém-criado
- **Quando** alguém abre a aba dele
- **Então** as colunas aparecem vazias, com o mesmo aviso de coluna vazia de Entrada, e o Admin ou o Gerente vê o botão "Adicionar contato"

#### CA-B41-24 — O quadro do funil novo fica bem arrumado · prova: manual

- **Dado** o preview publicado, com um funil de 3 etapas e outro de 8 etapas, cada um com cards
- **Quando** a Marcelle abre as abas no computador e no celular
- **Então** as abas cabem no cabeçalho (ou rolam, sem quebrar o layout), as colunas e os cards seguem o tema Caderno com as cores escolhidas, e nada fica desalinhado

### 3. Contato: chat e perfil

**Descrição:** onde o contato aparece, os cards dele nos funis novos aparecem junto com os de Entrada e Recompra.

**Componentes:**
- **Ficha do contato no chat:** a lista "Funil" mostra o nome de cada funil em que o contato está, com a etapa.
- **Perfil do contato:** mostra os funis do contato, cada um com link para o quadro daquele funil. O histórico mostra "Card criado no funil <nome>" e as mudanças de etapa.
- **Excluir e restaurar contato:** o aviso de exclusão conta os cards de todos os funis.

**Comportamentos:**
- Ver os funis do contato no chat.
- Ver os funis do contato no perfil e ir para o quadro.
- Ver o histórico de cards dos funis novos.
- Excluir o contato e restaurá-lo da lixeira com os cards de todos os funis.

**Critérios de aceite:**

#### CA-B41-25 — Chat e perfil mostram os funis novos · prova: automática

- **Dado** um contato com card em Entrada ("Sondagem") e em "Feira de Março" ("Confirmou")
- **Quando** alguém abre a ficha dele no chat e o perfil dele
- **Então** os dois lugares mostram "Funil de Entrada — Sondagem" e "Feira de Março — Confirmou". No perfil, cada um leva ao quadro do funil.

#### CA-B41-26 — Histórico do contato cita o funil novo · prova: automática

- **Dado** um contato adicionado a "Feira de Março" e movido de etapa
- **Quando** alguém abre o perfil
- **Então** o histórico mostra "Card criado no funil Feira de Março" e a mudança de etapa, com os nomes atuais do funil e da etapa

#### CA-B41-27 — Excluir e restaurar o contato leva e traz os cards dos funis novos · prova: automática

- **Dado** um contato com cards em Entrada e em dois funis novos
- **Quando** o Admin exclui o contato e depois o restaura da lixeira
- **Então** o aviso de exclusão diz que os 3 cards saem junto; na lixeira, os cards não aparecem em nenhum quadro; restaurado, os 3 voltam às etapas em que estavam

#### CA-B41-28 — Funil novo não muda a classificação do contato · prova: automática

- **Dado** um contato classificado como "Ativo" pelo card de Recompra
- **Quando** ele entra num funil novo, muda de etapa e sai dele
- **Então** a classificação continua "Ativo", e os relatórios (RFV, Carteiras, Coorte e Funil de clientes) mostram os mesmos números de antes

### 4. Automações

**Descrição:** o gatilho, a condição e a ação que falam de funil e etapa passam a oferecer os funis novos e as etapas de cada um.

**Componentes:**
- **Gatilho "Card movido para etapa":** a escolha de funil lista Entrada, Recompra e os funis da empresa; a etapa lista as etapas do funil escolhido.
- **Condição "Card está na etapa":** mesma escolha de funil e etapa.
- **Ação "Mover card":** mesma escolha. Num funil novo, se o contato ainda não tem card nele, a ação cria o card na etapa escolhida.

**Comportamentos:**
- Escolher funil novo e etapa no gatilho.
- Escolher funil novo e etapa na condição.
- Escolher funil novo e etapa na ação de mover.
- Disparar a automação quando um card entra numa etapa de funil novo.
- Colocar o contato num funil novo pela automação.

**Critérios de aceite:**

#### CA-B41-29 — O editor de automação oferece os funis novos · prova: automática

- **Dado** a empresa com o funil "Feira de Março"
- **Quando** alguém escolhe o funil no gatilho "Card movido para etapa", na condição "Card está na etapa" ou na ação "Mover card"
- **Então** as opções são "Funil de Entrada", "Funil de Recompra" e "Feira de Março". Escolhido "Feira de Março", as etapas oferecidas são as dele, na ordem do funil.

#### CA-B41-30 — Gatilho dispara pela etapa do funil novo · prova: automática

- **Dado** uma automação ligada com o gatilho "Card movido para etapa" em "Feira de Março" → "Confirmou"
- **Quando** um card desse funil é movido para "Confirmou", pela tela ou por outra automação
- **Então** a automação roda para aquele contato. Ela não roda quando o card entra em outra etapa, nem para a etapa de mesmo nome em outro funil.

#### CA-B41-31 — Condição confere a etapa do funil novo · prova: automática

- **Dado** uma automação com a condição "Card está na etapa" em "Feira de Março" → "Confirmou"
- **Quando** ela roda para um contato que está nessa etapa e para outro que não está nesse funil
- **Então** o primeiro segue pela saída "sim" e o segundo pela saída "não"

#### CA-B41-32 — A automação coloca o contato no funil novo · prova: automática

- **Dado** uma automação com a ação "Mover card" para "Feira de Março" → "Convidado"
- **Quando** ela roda para um contato que não está nesse funil, e depois para um que já está em outra etapa dele
- **Então** o primeiro ganha um card em "Convidado", e o segundo tem o card movido para "Convidado". Os dois ficam com a mudança no histórico e disparam os gatilhos de card movido.

#### CA-B41-33 — Salvar automação com etapa que não é do funil é recusado · prova: automática

- **Dado** uma automação montada fora da tela, com uma etapa que não existe no funil escolhido, com um funil de outra empresa ou com um funil apagado
- **Quando** alguém tenta salvá-la
- **Então** o servidor recusa, como já faz com etapa desconhecida

#### CA-B41-34 — Resumo da automação usa o nome atual do funil · prova: automática

- **Dado** uma automação que usa "Feira de Março" → "Confirmou"
- **Quando** o funil é renomeado para "Feira de Abril"
- **Então** a frase de resumo da automação, na lista e no editor, passa a dizer "Feira de Abril"

### 5. Aviso de card parado

**Descrição:** a etapa de funil novo pode ter um prazo em dias. O card que passa desse prazo sem mudar de etapa aparece como parado no quadro e na Central de Alertas.

**Comportamentos:**
- Definir o prazo de parado na etapa.
- Ver o card parado de funil novo na Central de Alertas.

**Critérios de aceite:**

#### CA-B41-35 — Prazo da etapa é opcional e tem limite · prova: automática

- **Dado** o editor do funil
- **Quando** alguém deixa o prazo vazio, coloca 1, coloca 365, ou tenta 0, 366 ou um texto
- **Então** vazio fica sem aviso, 1 e 365 são gravados, e 0, 366 e o texto são recusados com aviso

#### CA-B41-36 — Central de Alertas lista o card parado do funil novo · prova: automática

- **Dado** um card parado há 5 dias numa etapa de funil novo com prazo de 3 dias
- **Quando** o Admin abre a Central de Alertas
- **Então** o card aparece como parado, com o nome do funil, da etapa e os dias parado. Um Atendente só vê esse alerta se o card for dele.

### 6. Dashboard

**Descrição:** o gráfico do funil por etapa ganha uma escolha de funil. Ele abre em Entrada, como hoje.

**Comportamentos:**
- Trocar o funil do gráfico.

**Critérios de aceite:**

#### CA-B41-37 — Gráfico de funil escolhe o funil · prova: automática

- **Dado** o Dashboard de uma empresa com o funil "Feira de Março"
- **Quando** a pessoa abre o Dashboard e depois escolhe "Feira de Março" no gráfico de funil
- **Então** o gráfico abre em Entrada, com os mesmos números de hoje. Escolhido "Feira de Março", ele mostra quantos cards há em cada etapa desse funil, na ordem dele. O filtro de atendente continua valendo, e o Atendente vê só os próprios cards.

#### CA-B41-38 — As outras métricas do Dashboard não mudam · prova: automática

- **Dado** uma empresa com cards em funis novos
- **Quando** o Dashboard calcula conversão, leads ativos, recompras, em risco, inativos e perdidos
- **Então** os números são os mesmos que seriam sem os funis novos (só Entrada e Recompra contam)

### 7. Filtro de contatos

**Descrição:** o filtro avançado da lista de contatos ganha um campo para cada funil novo, igual aos campos de etapa de Entrada e de Recompra.

**Comportamentos:**
- Filtrar contatos pela etapa num funil novo.
- Filtrar quem está, ou não está, num funil novo.
- Abrir filtro salvo que usa funil ou etapa apagada.

**Critérios de aceite:**

#### CA-B41-39 — Filtro pela etapa do funil novo · prova: automática

- **Dado** contatos em várias etapas de "Feira de Março" e contatos fora dele
- **Quando** alguém filtra "Feira de Março" com as comparações "na etapa Confirmou", "fora da etapa Confirmou", "está no funil" e "não está no funil"
- **Então** cada filtro traz exatamente os contatos que batem, e a contagem bate com a lista. O campo aparece com o nome atual do funil e as etapas atuais dele.

#### CA-B41-40 — Filtro salvo com funil ou etapa apagada avisa · prova: automática

- **Dado** um filtro salvo que usa uma etapa, ou um funil, que depois foi apagado
- **Quando** alguém abre esse filtro
- **Então** a condição aparece marcada como "valor que não existe mais", do mesmo jeito que já acontece com etiqueta apagada, e o filtro não quebra a lista

## Fora de escopo

- **Segmentação de campanhas por etapa:** hoje as campanhas não filtram por etapa de nenhum funil, só pela classificação. Isso entra na spec de segmentação de campanhas, o próximo item da lista.
- **Mudar Entrada e Recompra:** etapas, nomes, a regra Ganho → Recompra, as sequências por etapa e a classificação ficam como estão.
- **Etapa com significado especial nos funis novos:** nenhuma etapa de funil novo é "ganho" ou "perdido", nem abre card em outro funil, nem inicia sequência sozinha. Para isso a pessoa usa as automações.
- **Classificação e relatórios:** os funis novos não mexem na classificação do contato nem em RFV, Coorte, Carteiras e Funil de clientes.
- **Conversão e métricas por funil novo no Dashboard:** além do gráfico de cards por etapa, nada.
- **Ligação entre times e funis:** os times continuam sem ligação com funil.
- **Arquivar funil:** apagar é definitivo.
- **Mais de um card do mesmo contato no mesmo funil.**
- **Gatilhos de sequência para funil novo:** as sequências automáticas continuam com os quatro gatilhos de hoje.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-01 | A tela de funis fica em Configurações → Funis, com atalho "Gerenciar funis" no cabeçalho do Pipeline, e o Gerente tem acesso a ela, mesmo que outras telas de Configurações sejam só do Admin | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-02 | Cada empresa tem no máximo 20 funis próprios, cada funil tem no máximo 20 etapas, e os nomes de funil e de etapa vão até 40 caracteres | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-03 | As abas dos funis novos aparecem depois de Entrada e Recompra, por ordem de criação (sem ordenar as abas à mão) | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-04 | O prazo de "parado" de cada etapa é definido no editor do funil, pelo Admin e pelo Gerente, e não na tela de Alertas, que continua com os quatro prazos de Entrada e Recompra e só para o Admin | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-05 | Ao ser criado, o card de funil novo fica sem atendente; quem cria pode atribuir depois pelo painel | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-06 | Apagar etapa ou funil vale também para automação desligada: a trava conta todas as automações da empresa, não só as ligadas | invalidada | Marcelle, 23/10/2026: não trava; permite apagar com aviso, e as automações afetadas (ligadas ou desligadas) ficam desligadas e marcadas "precisa de ajuste" (CA-B41-11 e CA-B41-41) |
| SUP-B41-07 | A cor da etapa vem da mesma paleta de cores de coluna que Entrada e Recompra já usam, sem cor livre | invalidada | Marcelle, 23/10/2026: paleta pronta mais "outra cor" livre, com o texto da coluna ajustado sozinho para ficar legível nos dois temas (CA-B41-08 e CA-B41-42) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-01 | Quem pode criar funis? | respondida | Marcelle, 23/10/2026: Admin e Gerente |
| PER-B41-02 | As etapas dos funis novos são próprias e editáveis? | respondida | Marcelle, 23/10/2026: próprias e editáveis |
| PER-B41-03 | Entrada e Recompra continuam fixos? | respondida | Marcelle, 23/10/2026: sim, ficam fixos |
| PER-B41-04 | O contato pode estar em vários funis? | respondida | Marcelle, 23/10/2026: um card por funil, como hoje; vários funis, uma vez em cada |
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |
| PER-B41-06 | Como o contato entra num funil novo? | respondida | Marcelle, 23/10/2026: botão "Adicionar contato" no quadro (Admin e Gerente) e ação "Mover card" das automações |
| PER-B41-07 | Ao apagar etapa com cards, o que acontece? | respondida | Marcelle, 23/10/2026: pede a etapa de destino |
| PER-B41-08 | Ao apagar funil, o que acontece? | respondida | Marcelle, 23/10/2026: confirma com o número de cards, e os cards saem junto; a trava por automação foi trocada pelo aviso e pelo desligamento (ver SUP-B41-06) |
| PER-B41-09 | A classificação do contato considera os funis novos? | respondida | Marcelle, 23/10/2026: não, só Entrada e Recompra |
