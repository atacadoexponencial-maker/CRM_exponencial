# Spec: Segmentação de campanhas pelo filtro de Contatos

> série: B42
> estado: concluída em 24/10/2026 (aprovada em 24/10/2026; revista e aprovada de novo no mesmo dia: filtros salvos de campanha separados)

## Visão Geral

Hoje a etapa "Destinatários" da campanha tem filtros próprios e limitados: classificação,
tipo, etiqueta (qualquer uma das escolhidas), cidade (parte do nome) e um atendente,
sempre combinados com E. Não dá para mandar campanha para quem está numa etapa de funil,
nem para quem comprou há mais de 60 dias, nem combinar condições com OU.

A lista de Contatos já tem um filtro avançado (série B37, ampliada na B41) que faz tudo
isso: todos os campos do cadastro, etiquetas, compras, a etapa de cada funil (Entrada,
Recompra e os funis criados pela empresa), grupos com E/OU e filtros salvos da empresa.

Esta mudança:

1. troca os filtros próprios da campanha pelo **mesmo filtro avançado de Contatos**, para
   existir uma regra só de "quais contatos batem" no sistema inteiro;
2. deixa a campanha **usar e salvar os filtros salvos** da empresa;
3. acrescenta ao filtro, nas duas telas, o campo **Perfil RFV** e renomeia o campo
   Atendente para **Atendente (carteira)**;
4. **converte sozinhas** as campanhas antigas, com o mesmo resultado de antes.

É para o Admin e o Gerente, que são quem monta campanha hoje. O problema que resolve:
mandar a mensagem certa para o grupo certo (ex.: "quem está na etapa Proposta do funil
Feira de Março", "Campeões e Fiéis da carteira da Ana", "clientes que não compram há 90
dias") sem exportar planilha nem etiquetar contato um por um.

## Páginas / Módulos

### Editor da campanha — etapa Destinatários

**Descrição:** na etapa 1 do editor (`/campanhas/[id]`), no lugar dos chips de
classificação, tipo e etiqueta e dos campos cidade e atendente, aparece o filtro avançado
de Contatos. O nome da campanha, a contagem de destinatários e a amostra dos primeiros
nomes continuam como hoje. O reenvio para quem falhou continua sem filtro (os
destinatários são fixos).

**Componentes:**
- Botão "Filtrar" e painel do filtro: os mesmos da lista de Contatos (grupos, condições
  com campo, comparação e valor, chaves E/OU dentro e entre grupos, "Limpar filtro").
- Resumo do filtro montado, legível sem abrir o painel (ex.: "Etapa no funil Feira de
  Março está na etapa Proposta E Tipo é Lojista").
- Contagem "N destinatários" e amostra dos primeiros nomes com telefone, como hoje.
- Aviso de filtro com funil ou etapa que não existe mais.

**Comportamentos:**
- Abrir o painel do filtro pelo botão "Filtrar".
- Acrescentar, mudar e remover condições, com os mesmos campos e comparações da lista de
  Contatos.
- Filtrar pela etapa de qualquer funil da empresa: Entrada, Recompra ou funil criado
  pela empresa.
- Acrescentar e remover grupos; trocar E/OU dentro do grupo e entre grupos.
- Limpar o filtro (sem filtro, a campanha vai para todos os contatos válidos, como hoje
  quando nenhum chip está marcado).
- Ver a contagem e a amostra se atualizarem enquanto monta o filtro.
- Ler o resumo do filtro sem abrir o painel.
- Tentar avançar sem destinatário e ser impedida, como hoje.
- Salvar como rascunho e, ao reabrir, encontrar o mesmo filtro.
- Confirmar a campanha: a lista de quem recebe é fechada nesse momento, como hoje.
- Abrir uma campanha cujo filtro usa funil ou etapa apagada e ver o aviso.
- Abrir um reenvio e ver que os destinatários são os que falharam, sem filtro.

**Critérios de aceite:**

#### CA-B42-01 — A etapa Destinatários usa o filtro de Contatos · prova: automática

- **Dado** uma campanha nova aberta na etapa Destinatários
- **Quando** a pessoa clica em "Filtrar"
- **Então** abre o mesmo painel da lista de Contatos, com os mesmos campos agrupados por
  assunto e as mesmas comparações por tipo de campo; os chips antigos de classificação,
  tipo e etiqueta e os campos cidade e atendente não aparecem mais

#### CA-B42-02 — Campanha pela etapa de Entrada, de Recompra e de funil novo · prova: automática

- **Dado** uma empresa com contatos nas etapas "Proposta" de Entrada, "Reposição" de
  Recompra e "Visitou o estande" do funil novo "Feira de Março", e contatos em outras
  etapas
- **Quando** o filtro é, um de cada vez, "Etapa no funil de Entrada está na etapa
  Proposta", "Etapa no funil de Recompra está na etapa Reposição" e "Etapa no funil Feira
  de Março está na etapa Visitou o estande"
- **Então** a contagem e a amostra trazem exatamente os contatos de cada etapa, e mais
  ninguém

#### CA-B42-03 — Grupos com E e OU funcionam na campanha · prova: automática

- **Dado** contatos de Fortaleza lojistas, de Fortaleza revendedores e de Recife lojistas
- **Quando** o filtro da campanha é (Cidade é igual a Fortaleza OU Cidade é igual a
  Recife) E (Tipo é Lojista)
- **Então** a campanha conta os de Fortaleza lojistas e os de Recife lojistas, e não conta
  os revendedores

#### CA-B42-04 — Campanha e Contatos trazem os mesmos contatos para o mesmo filtro · prova: automática

- **Dado** um filtro com condições de cadastro, etiqueta, compras e funil
- **Quando** o mesmo filtro é aplicado na lista de Contatos e na campanha, pelo Admin
- **Então** os contatos da campanha são os da lista de Contatos, menos só os que a
  campanha já tira hoje: telefone que não é um WhatsApp válido do Brasil

#### CA-B42-05 — Quem está na lixeira não entra na campanha · prova: automática

- **Dado** um contato que bate com o filtro e foi para a lixeira
- **Quando** a campanha conta os destinatários e quando ela é confirmada
- **Então** esse contato não é contado nem entra na lista de envio

#### CA-B42-06 — A contagem acompanha o filtro enquanto ele é montado · prova: automática

- **Dado** a etapa Destinatários com um filtro que conta 40 contatos
- **Quando** a pessoa acrescenta uma condição que deixa 12 deles, e depois a remove
- **Então** a contagem mostra 12 e depois volta a 40, e a amostra muda junto

#### CA-B42-07 — Sem filtro, a campanha vai para todos os contatos válidos · prova: automática

- **Dado** uma empresa com 30 contatos válidos fora da lixeira
- **Quando** a pessoa limpa o filtro
- **Então** a contagem mostra 30 destinatários

#### CA-B42-08 — Resumo do filtro legível sem abrir o painel · prova: automática

- **Dado** um filtro com dois grupos ligados por E, um deles com duas condições ligadas por OU
- **Quando** o painel está fechado
- **Então** a etapa Destinatários mostra o resumo do filtro, com cada condição escrita com
  os nomes que a pessoa escolheu (nome do funil, da etapa, da etiqueta, do atendente) e
  os E/OU no lugar certo

#### CA-B42-09 — Não avança sem destinatário · prova: automática

- **Dado** um filtro que não traz nenhum contato
- **Quando** a pessoa clica em "Próximo"
- **Então** a tela avisa que a campanha precisa de pelo menos um destinatário e continua
  na etapa 1, como hoje

#### CA-B42-10 — O rascunho guarda o filtro · prova: automática

- **Dado** uma campanha com um filtro de dois grupos salva como rascunho
- **Quando** a pessoa sai e abre a campanha de novo
- **Então** o painel mostra os mesmos grupos, condições e E/OU, e a contagem é a mesma

#### CA-B42-11 — A lista é fechada na confirmação · prova: automática

- **Dado** uma campanha agendada, confirmada com 20 destinatários pelo filtro "Etapa no
  funil de Entrada está na etapa Proposta"
- **Quando**, antes do horário do envio, um desses contatos muda de etapa e um contato
  novo entra em Proposta
- **Então** a campanha envia para os mesmos 20 da confirmação, e o relatório mostra esses 20

#### CA-B42-12 — Filtro com funil ou etapa apagada avisa e não confirma · prova: automática

- **Dado** um rascunho ou uma campanha agendada ainda não enviada cujo filtro usa uma
  etapa, ou um funil, que depois foi apagado
- **Quando** a pessoa abre a campanha
- **Então** a etapa Destinatários avisa qual condição usa funil ou etapa que não existe
  mais, e a campanha não pode ser confirmada até a pessoa trocar ou remover essa condição

#### CA-B42-13 — Reenvio continua sem filtro · prova: automática

- **Dado** uma campanha enviada com 3 falhas
- **Quando** a pessoa cria o reenvio e abre a etapa Destinatários
- **Então** aparece o aviso de que os destinatários são os que falharam, sem botão
  "Filtrar", e a contagem é 3 (menos quem foi para a lixeira), como hoje

#### CA-B42-14 — Só Admin e Gerente montam o filtro de campanha · prova: automática

- **Dado** um Atendente logado
- **Quando** ele tenta contar destinatários ou salvar uma campanha com filtro, chamando o
  servidor direto
- **Então** o servidor recusa, como recusa hoje para campanhas

#### CA-B42-15 — O filtro da campanha só enxerga a própria empresa · prova: automática

- **Dado** duas empresas com contatos que batem com o mesmo filtro
- **Quando** o Admin da primeira conta os destinatários
- **Então** só entram contatos da primeira empresa, inclusive nas condições de etiqueta,
  compras, funil e perfil RFV

### Editor da campanha — filtros salvos

**Descrição:** na etapa Destinatários, a pessoa pode partir de um filtro salvo de
campanha e pode salvar o filtro que montou como filtro salvo novo. A campanha guarda uma
**cópia** das condições: mexer depois no filtro salvo não muda campanha já montada.

**Revisto em 24/10/2026 (PER-B42-02):** os filtros salvos de campanha são **separados**
dos da lista de Contatos. Cada tela tem a própria lista; um filtro salvo numa não aparece
na outra. Na campanha dá para fazer tudo o que a lista de Contatos faz com os filtros
dela: salvar, atualizar com o filtro montado, renomear, mudar a ordem e apagar (Admin e
Gerente). Os filtros salvos que já existiam ficam em Contatos.

**Componentes:**
- Lista dos filtros salvos de campanha da empresa, na ordem escolhida.
- Ação "Salvar filtro" com campo de nome, e "Atualizar filtro salvo" quando um está marcado.
- Menu de cada filtro salvo de campanha: renomear, mover para a esquerda ou a direita, apagar.
- Indicação de qual filtro salvo foi usado como ponto de partida, enquanto as condições
  não forem mexidas.

**Comportamentos:**
- Escolher um filtro salvo e ver as condições dele no painel.
- Ajustar as condições depois de escolher um filtro salvo, sem mudar o filtro salvo.
- Salvar o filtro montado na campanha com um nome.
- Tentar salvar com nome que já existe e ser avisada.
- Atualizar o filtro salvo marcado com as condições montadas.
- Renomear um filtro salvo de campanha.
- Mudar a ordem dos filtros salvos de campanha.
- Apagar um filtro salvo de campanha.

**Critérios de aceite:**

#### CA-B42-16 — Escolher um filtro salvo monta o filtro da campanha · prova: automática

- **Dado** o filtro salvo "Lojistas de Fortaleza"
- **Quando** a pessoa o escolhe na etapa Destinatários
- **Então** o painel mostra as condições dele, e a contagem é igual ao número de contatos
  que ele traz na lista de Contatos (menos os telefones inválidos)

#### CA-B42-17 — Ajustar na campanha não muda o filtro salvo · prova: automática

- **Dado** a campanha montada a partir de "Lojistas de Fortaleza"
- **Quando** a pessoa acrescenta uma condição na campanha
- **Então** o filtro salvo "Lojistas de Fortaleza" continua com as condições de antes

#### CA-B42-18 — Mudar o filtro salvo depois não muda a campanha · prova: automática

- **Dado** um rascunho montado a partir de "Lojistas de Fortaleza"
- **Quando** alguém atualiza ou apaga esse filtro salvo
- **Então** o rascunho continua com as condições que tinha

#### CA-B42-19 — Salvar o filtro da campanha como filtro salvo · prova: automática

- **Dado** um Admin ou Gerente com um filtro montado na campanha
- **Quando** escolhe "Salvar filtro" e dá o nome "Proposta da feira"
- **Então** "Proposta da feira" aparece nos filtros salvos de campanha, para a empresa
  toda, com as mesmas condições, e não aparece nos filtros salvos da lista de Contatos

#### CA-B42-20 — Nome repetido não salva · prova: automática

- **Dado** o filtro salvo de campanha "Lojistas de Fortaleza"
- **Quando** alguém tenta salvar pela campanha outro com o nome "lojistas de fortaleza"
- **Então** a tela avisa que já existe um filtro com esse nome e não salva, como na lista
  de Contatos. Um filtro de Contatos com o mesmo nome não impede salvar o de campanha

#### CA-B42-32 — Cada tela só mostra os próprios filtros salvos · prova: automática

- **Dado** o filtro salvo "Clientes da feira" na lista de Contatos e o filtro salvo de
  campanha "Proposta da feira"
- **Quando** a pessoa abre a lista de Contatos e depois a etapa Destinatários da campanha
- **Então** Contatos mostra só "Clientes da feira" e a campanha mostra só "Proposta da
  feira", inclusive para quem chama o servidor direto

#### CA-B42-33 — Atualizar o filtro salvo de campanha · prova: automática

- **Dado** a campanha montada a partir do filtro salvo de campanha "Proposta da feira"
- **Quando** a pessoa acrescenta uma condição no painel e escolhe "Atualizar filtro salvo"
- **Então** "Proposta da feira" passa a ter a condição nova para a empresa toda, e a lista
  de Contatos não muda

#### CA-B42-34 — Renomear o filtro salvo de campanha · prova: automática

- **Dado** os filtros salvos de campanha "Proposta da feira" e "Lojistas de Fortaleza"
- **Quando** a pessoa renomeia "Proposta da feira" para "Feira 2026", e depois tenta
  renomeá-lo para "lojistas de fortaleza"
- **Então** o primeiro nome novo fica gravado; o segundo é recusado com o aviso de nome
  repetido

#### CA-B42-35 — Mudar a ordem dos filtros salvos de campanha · prova: automática

- **Dado** os filtros salvos de campanha "A", "B" e "C", nessa ordem
- **Quando** a pessoa move "C" para a esquerda
- **Então** a faixa da campanha mostra "A", "C", "B", para a empresa toda, e a ordem dos
  filtros da lista de Contatos não muda

#### CA-B42-36 — Apagar o filtro salvo de campanha · prova: automática

- **Dado** o filtro salvo de campanha "Proposta da feira"
- **Quando** a pessoa escolhe apagar e confirma
- **Então** ele some da faixa da campanha, e os filtros da lista de Contatos continuam lá

#### CA-B42-37 — Atendente não mexe nos filtros salvos de campanha · prova: automática

- **Dado** um Atendente logado
- **Quando** ele tenta salvar, atualizar, renomear, mover ou apagar um filtro salvo de
  campanha chamando o servidor direto
- **Então** o servidor recusa e nada muda

### Filtro de contatos — campo Perfil RFV e Atendente (carteira)

**Descrição:** o filtro avançado, na lista de Contatos e na campanha, ganha o campo
**Perfil RFV** no assunto Compras, e o campo Atendente passa a se chamar **Atendente
(carteira)**. O perfil é o mesmo que a aba RFV dos Relatórios mostra **sem filtro de
atendente**, calculado sobre a empresa inteira na data de hoje: um cliente tem um perfil
só, igual para quem quer que filtre. Quem nunca comprou não tem perfil.

**Componentes:**
- Campo "Perfil RFV" (tipo lista), com os 11 perfis na ordem da aba RFV: Campeão, Clientes
  Fiéis, Potencial Fiel, Clientes Recentes, Clientes Promissores, Precisa de Atenção, Não
  Perder, Em Risco, Semi Perdido, Hibernando, Perdido.
- Campo "Atendente (carteira)", no lugar de "Atendente", com as mesmas comparações.

**Comportamentos:**
- Filtrar por um perfil RFV.
- Filtrar por qualquer um de vários perfis RFV.
- Filtrar quem não tem perfil RFV (nunca comprou) ou quem tem algum.
- Filtrar pela carteira de um vendedor pelo campo Atendente (carteira).

**Critérios de aceite:**

#### CA-B42-21 — O filtro por perfil RFV traz os mesmos clientes da aba RFV · prova: automática

- **Dado** uma empresa com vendas que dão clientes em vários perfis
- **Quando** o filtro é "Perfil RFV é Campeão" e depois "Perfil RFV é qualquer um de Em
  Risco, Não Perder"
- **Então** os contatos encontrados são exatamente os que a aba RFV dos Relatórios, sem
  filtro de atendente, lista nesses perfis hoje

#### CA-B42-22 — O perfil não muda com quem filtra · prova: automática

- **Dado** um cliente que é Campeão na base da empresa inteira e que teria outro perfil se
  o cálculo usasse só os clientes do atendente dele
- **Quando** o Admin e o Atendente dono desse cliente filtram por "Perfil RFV é Campeão"
  na lista de Contatos
- **Então** o cliente aparece para os dois como Campeão

#### CA-B42-23 — Quem nunca comprou não tem perfil · prova: automática

- **Dado** um contato sem nenhuma compra e um com compras
- **Quando** o filtro é "Perfil RFV está vazio" e depois "Perfil RFV não está vazio"
- **Então** o primeiro filtro traz só o que nunca comprou; o segundo, só o que comprou

#### CA-B42-24 — "Não é" não traz quem não tem perfil · prova: automática

- **Dado** um Campeão, um Perdido e um contato que nunca comprou
- **Quando** o filtro é "Perfil RFV não é Campeão"
- **Então** aparece só o Perdido, como as outras comparações negativas do filtro

#### CA-B42-25 — O campo Atendente passa a se chamar Atendente (carteira) · prova: automática

- **Dado** o painel do filtro aberto na lista de Contatos e na campanha
- **Quando** a pessoa abre a lista de campos
- **Então** aparece "Atendente (carteira)" no lugar de "Atendente", e um filtro salvo que
  já usava Atendente continua trazendo os mesmos contatos

#### CA-B42-26 — Atendente segue vendo só os próprios contatos · prova: automática

- **Dado** um Atendente logado na lista de Contatos
- **Quando** filtra por "Perfil RFV é Campeão"
- **Então** aparecem só os Campeões que ele já enxerga hoje

### Campanhas antigas

**Descrição:** campanhas criadas antes desta mudança, em qualquer estado (rascunho,
agendada, enviando, enviada, cancelada), guardam os filtros do jeito antigo. Ao abrir,
elas aparecem com o filtro novo montado com as mesmas regras, e dão o mesmo resultado.
Campanhas já enviadas não mudam de destinatários: a lista delas já foi fechada na
confirmação.

**Conversão:** todas as condições ficam num grupo só, ligadas por E.

| Filtro antigo | Condição no filtro novo |
|---|---|
| Classificação (chips marcados) | Classificação é qualquer um de [marcados] |
| Tipo de contato (chips marcados) | Tipo é qualquer um de [marcados] |
| Tag do contato (chips marcados) | Etiqueta tem qualquer uma de [marcadas] |
| Cidade (texto) | Cidade contém [texto] |
| Atendente responsável | Atendente (carteira) é [atendente] |
| Nenhum filtro | Sem filtro |

**Comportamentos:**
- Abrir um rascunho antigo e encontrar os filtros dele no painel novo.
- Confirmar uma campanha agendada antiga sem precisar refazer o filtro.
- Abrir o relatório e criar o reenvio de uma campanha antiga, como hoje.

**Critérios de aceite:**

#### CA-B42-27 — Rascunho antigo abre com o filtro equivalente · prova: automática

- **Dado** um rascunho antigo com Tipo Lojista e Revendedor, etiqueta "VIP", cidade
  "Forta" e atendente Ana
- **Quando** a pessoa abre o rascunho
- **Então** o painel mostra um grupo com "Tipo é qualquer um de Lojista, Revendedor" E
  "Etiqueta tem qualquer uma de VIP" E "Cidade contém Forta" E "Atendente (carteira) é
  Ana"

#### CA-B42-28 — A conversão dá o mesmo resultado de antes · prova: automática

- **Dado** campanhas antigas com cada um dos filtros antigos, sozinhos e combinados, e
  contatos que batem e que não batem com cada um
- **Quando** os destinatários são contados pela regra antiga e pelo filtro convertido
- **Então** as duas contagens trazem exatamente os mesmos contatos, com uma diferença só:
  a cidade passa a ignorar acento, então "Cidade contém Sao Paulo" acha também quem tem
  "São Paulo" (a regra antiga não achava)

#### CA-B42-29 — Agendada antiga é enviada sem refazer o filtro · prova: automática

- **Dado** uma campanha agendada antes desta mudança, já com a lista fechada
- **Quando** chega o horário do envio
- **Então** ela é enviada para a lista que foi fechada na confirmação, como hoje

#### CA-B42-30 — Relatório e reenvio de campanha antiga continuam funcionando · prova: automática

- **Dado** uma campanha enviada antes desta mudança, com falhas
- **Quando** a pessoa abre o relatório e cria o reenvio
- **Então** o relatório mostra os mesmos destinatários de antes e o reenvio traz os que
  falharam

### Aprovação visual

#### CA-B42-31 — A etapa Destinatários fica bem arrumada · prova: manual

- **Dado** o preview publicado
- **Quando** a Marcelle monta uma campanha com filtro de dois grupos, usa um filtro salvo
  e salva um filtro novo, no computador e no celular, nos temas claro e escuro
- **Então** ela aprova o painel, o resumo do filtro, a lista de filtros salvos e a
  contagem, e confere que o campo Perfil RFV e o Atendente (carteira) aparecem também na
  lista de Contatos

## Fora de escopo

- Mudar as etapas Mensagem e Agendamento da campanha.
- Fechar a lista na hora do envio em vez da confirmação (decidido: continua na confirmação).
- Perfil RFV visível no contato, na lista de contatos (como coluna) ou no painel do chat;
  gatilho ou condição de automação por perfil RFV. São itens próprios da lista de pedidos.
- Perfil RFV numa data passada; o filtro usa sempre o perfil de hoje.
- Campos personalizados do contato (série B38).
- UF em automações e na importação.
- Excluir automaticamente da campanha quem recebeu outra campanha há pouco tempo, ou quem
  pediu para não receber.
- Segmentar campanha por quem abriu, leu ou respondeu campanha anterior.
- Mudar quem pode criar campanha (continua Admin e Gerente).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B42-01 | A campanha guarda uma cópia das condições do filtro salvo usado, não um vínculo: mudar ou apagar o filtro salvo depois não muda campanha já montada. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-02 | "Cidade contém" do filtro novo compara a cidade do mesmo jeito que a campanha de hoje. | invalidada | Lido no código em 23/10/2026: o filtro novo ignora maiúscula e acento, e o da campanha só ignorava maiúscula. A Marcelle aceitou que a conversão passe a achar também a cidade com acento (23/10/2026); CA-B42-28 ajustado |
| SUP-B42-03 | Em campanha, o filtro funciona com a visão do Admin e do Gerente (todos os contatos da empresa); não há caso de Atendente montando campanha. | confirmada | Lido no código em 23/10/2026: toda action de campanha passa por `perfilGestor` (só Admin e Gerente) |
| SUP-B42-04 | Filtro com funil ou etapa apagada impede a confirmação até a pessoa ajustar, em vez de só ignorar a condição. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-05 | Campanha já enviada, cancelada ou em envio não precisa mostrar o filtro no painel; basta o relatório e o reenvio continuarem iguais. | confirmada | Marcelle, 23/10/2026 |
| SUP-B42-06 | Sem filtro, o resumo da etapa Destinatários diz "Sem filtro: todos os contatos com WhatsApp válido." | confirmada | Marcelle, 24/10/2026 |
| SUP-B42-07 | O aviso de funil ou etapa apagada diz "Este filtro usa funil ou etapa que não existe mais: [condição]. Troque ou remova essa condição para confirmar.", e a etapa sumida aparece no resumo como "(etapa apagada)". | confirmada | Marcelle, 24/10/2026 |
| SUP-B42-08 | O nome do filtro salvo é único dentro de cada tela: a campanha pode ter um filtro com o mesmo nome de um da lista de Contatos. | confirmada | Marcelle, 24/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B42-01 | A campanha escolhe quem recebe pelo mesmo filtro avançado de Contatos ou só ganha o filtro de etapa do funil? | respondida | Mesmo filtro de Contatos, no lugar dos filtros de hoje (Marcelle, 23/10/2026) |
| PER-B42-02 | A campanha usa os filtros salvos da lista de Contatos? | respondida | Sim, carrega e salva (Marcelle, 23/10/2026). **Revisto em 24/10/2026:** não; a campanha tem filtros salvos próprios, separados dos de Contatos, e pode salvar, atualizar, renomear, mover e apagar (Marcelle, 24/10/2026) |
| PER-B42-03 | Que campos novos entram no filtro além dos que ele já tem? | respondida | Perfil RFV e carteira (Marcelle, 23/10/2026) |
| PER-B42-04 | Carteira é diferente do atendente do contato? | respondida | Não: o campo Atendente passa a se chamar "Atendente (carteira)", nas duas telas (Marcelle, 23/10/2026) |
| PER-B42-05 | O perfil RFV do filtro é calculado sobre qual base? | respondida | Empresa inteira, o mesmo da aba RFV sem filtro de atendente (Marcelle, 23/10/2026) |
| PER-B42-06 | Campanha agendada fecha a lista de quem recebe quando? | respondida | Na confirmação, como hoje (Marcelle, 23/10/2026) |
| PER-B42-07 | O que acontece com as campanhas antigas? | respondida | Convertem sozinhas para o filtro novo, com o mesmo resultado (Marcelle, 23/10/2026) |
