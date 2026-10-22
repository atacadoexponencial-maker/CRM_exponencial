# Spec: Filtro avançado de contatos

> série: B37
> estado: aprovada em 22/10/2026

## Visão Geral

Hoje a lista de Contatos só filtra por classificação, tipo, nicho e atendente, com
botões fixos no topo, e o filtro olha apenas os contatos já carregados na tela (a lista
vem de 50 em 50). Numa base grande, contatos ainda não carregados ficam de fora sem
aviso.

Esta mudança troca isso por um **filtro avançado**: a pessoa monta condições sobre
qualquer dado do contato (cadastro, etiquetas, compras e etapa do funil), organiza as
condições em grupos combinados por E ou OU, e o resultado vale para a **base inteira**.
Admin e Gerente salvam filtros com nome; os filtros salvos ficam para a empresa toda e
aparecem no topo da lista, ao lado dos botões fixos de hoje, que continuam.

Campo que o sistema ganhar no futuro entra no filtro sem trabalho de tela. Os campos
personalizados criados pela empresa são a série seguinte (B38) e entram neste mesmo
filtro quando ela existir.

A mudança entra depois do merge da série do tema Caderno (B36) e segue a linguagem
visual dela.

## Páginas / Módulos

### Lista de Contatos — montar o filtro

**Descrição:** na lista de contatos (`/contatos`), um botão "Filtrar" abre o painel onde
a pessoa monta o filtro. Todos os papéis usam; o atendente filtra só dentro dos contatos
que já enxerga hoje.

**Componentes:**
- Botão "Filtrar": abre o painel; mostra quantas condições estão ligadas (ex.: "Filtrar · 3").
- Painel do filtro: lista de grupos; cada grupo com suas condições.
- Condição: três partes — campo, comparação e valor.
- Chave E/OU dentro de cada grupo e chave E/OU entre os grupos.
- Contagem do resultado: "N contatos encontrados".
- Ação "Limpar filtro".

**Comportamentos:**
- Abrir o painel do filtro pelo botão "Filtrar".
- Acrescentar uma condição a um grupo.
- Escolher o campo da condição numa lista agrupada por assunto (Cadastro, Etiquetas,
  Compras, Funil).
- Escolher a comparação, que depende do tipo do campo.
- Informar o valor (texto, número, data, ou escolha numa lista dos valores que existem).
- Remover uma condição.
- Acrescentar um grupo novo.
- Remover um grupo inteiro.
- Trocar entre E e OU dentro de um grupo.
- Trocar entre E e OU entre os grupos.
- Limpar o filtro inteiro.
- Combinar o filtro com a busca por nome ou telefone que já existe.
- Ordenar o resultado filtrado com a ordenação que já existe.
- Carregar mais resultados ao rolar, como hoje.

**Campos disponíveis:**

| Assunto | Campo | Tipo |
|---|---|---|
| Cadastro | Nome | texto |
| Cadastro | Telefone | texto |
| Cadastro | Classificação | lista |
| Cadastro | Tipo | lista |
| Cadastro | Nicho | lista |
| Cadastro | Cidade | texto |
| Cadastro | UF | lista |
| Cadastro | Perfil de cliente (ICP) | lista |
| Cadastro | Atendente | lista |
| Cadastro | Observações | texto |
| Cadastro | Data de cadastro | data |
| Etiquetas | Etiqueta | etiqueta |
| Compras | Total já comprado | número (R$) |
| Compras | Quantidade de compras | número |
| Compras | Data da última compra | data |
| Funil | Etapa no funil de Entrada | lista |
| Funil | Etapa no funil de Recompra | lista |

**Comparações por tipo de campo:**

| Tipo | Comparações |
|---|---|
| texto | contém · não contém · é igual a · está vazio · não está vazio |
| lista | é · não é · é qualquer um de · está vazio · não está vazio |
| número | maior que · menor que · entre · igual a |
| data | antes de · depois de · entre · nos últimos N dias · há mais de N dias · está vazia · não está vazia |
| etiqueta | tem · não tem · tem qualquer uma de · tem todas de · sem etiqueta · com alguma etiqueta |
| funil (lista) | está na etapa · não está na etapa · está no funil (qualquer etapa) · não está no funil |

"Está vazio" e "não está vazio" existem em todo campo que não é obrigatório. Os
obrigatórios (Telefone, Classificação, Data de cadastro) não têm essas duas opções. Os
campos de Compras nunca ficam vazios: quem nunca comprou tem total 0 e quantidade 0, e a
data da última compra vazia.

As comparações negativas ("não é", "não contém", "não tem", "não está na etapa") **não**
trazem contatos com o campo vazio. Ex.: "Cidade não é Fortaleza" traz só quem tem cidade
preenchida e diferente de Fortaleza; para pegar quem não tem cidade, a pessoa acrescenta
"Cidade está vazio" com OU.

**Critérios de aceite:**

#### CA-B37-01 — O botão "Filtrar" abre o painel do filtro · prova: automática

- **Dado** a lista de contatos aberta, sem filtro
- **Quando** a pessoa clica em "Filtrar"
- **Então** o painel abre com um grupo vazio e a opção de acrescentar condição

#### CA-B37-02 — Cada campo mostra só as comparações do seu tipo · prova: automática

- **Dado** o painel aberto
- **Quando** a pessoa escolhe um campo de cada tipo (texto, lista, número, data, etiqueta, funil)
- **Então** a lista de comparações mostra exatamente as da tabela "Comparações por tipo de campo"

#### CA-B37-03 — Todos os campos da tabela aparecem para escolher · prova: automática

- **Dado** o painel aberto
- **Quando** a pessoa abre a lista de campos
- **Então** aparecem todos os campos da tabela "Campos disponíveis", agrupados por assunto

#### CA-B37-36 — "Está vazio" só em campo que não é obrigatório · prova: automática

- **Dado** o painel aberto
- **Quando** a pessoa escolhe Cidade, depois Telefone
- **Então** Cidade oferece "está vazio" e "não está vazio"; Telefone não oferece

#### CA-B37-37 — Comparação negativa não traz quem tem o campo vazio · prova: automática

- **Dado** contatos de Fortaleza, de Recife e sem cidade
- **Quando** o filtro é "Cidade não é Fortaleza", depois "Cidade está vazio"
- **Então** o primeiro traz só o de Recife; o segundo traz só o sem cidade

#### CA-B37-04 — Campo novo do contato entra no filtro sozinho · prova: automática

- **Dado** que o contato ganhou um campo novo no sistema
- **Quando** os testes rodam
- **Então** um teste falha se esse campo não estiver na lista de campos do filtro ou não
  estiver explicitamente marcado como "fora do filtro" (ex.: dados internos como a foto)

#### CA-B37-05 — Condições do mesmo grupo com E · prova: automática

- **Dado** contatos de Fortaleza lojistas, de Fortaleza revendedores e de Recife lojistas
- **Quando** o grupo tem "Cidade é igual a Fortaleza" E "Tipo é Lojista"
- **Então** só aparecem os de Fortaleza lojistas

#### CA-B37-06 — Condições do mesmo grupo com OU · prova: automática

- **Dado** os mesmos contatos
- **Quando** o grupo tem "Cidade é igual a Fortaleza" OU "Cidade é igual a Recife"
- **Então** aparecem os três contatos

#### CA-B37-07 — Grupos combinados entre si · prova: automática

- **Dado** os mesmos contatos
- **Quando** o filtro é (Cidade = Fortaleza OU Cidade = Recife) E (Tipo é Lojista)
- **Então** aparecem os de Fortaleza lojistas e os de Recife lojistas, e não aparecem os revendedores

#### CA-B37-08 — O filtro acha contatos que ainda não estavam na tela · prova: automática

- **Dado** uma empresa com mais de 50 contatos, e um contato que satisfaz o filtro está
  além dos 50 primeiros da lista
- **Quando** a pessoa aplica o filtro
- **Então** esse contato aparece no resultado e a contagem conta ele

#### CA-B37-09 — A contagem mostra o total do resultado · prova: automática

- **Dado** um filtro que satisfaz 120 contatos
- **Quando** o filtro é aplicado
- **Então** a tela mostra "120 contatos encontrados", mesmo exibindo só os 50 primeiros

#### CA-B37-10 — Rolar a lista carrega mais resultados do filtro · prova: automática

- **Dado** um filtro com 120 contatos no resultado
- **Quando** a pessoa chega ao fim da lista
- **Então** carregam os próximos contatos do resultado, nunca contatos fora do filtro

#### CA-B37-11 — Remover uma condição atualiza o resultado · prova: automática

- **Dado** um filtro com duas condições
- **Quando** a pessoa remove uma delas
- **Então** o resultado passa a obedecer só à que ficou

#### CA-B37-12 — Limpar o filtro volta à lista completa · prova: automática

- **Dado** um filtro aplicado
- **Quando** a pessoa clica em "Limpar filtro"
- **Então** a lista volta a mostrar todos os contatos que ela enxerga e o botão volta a "Filtrar" sem número

#### CA-B37-13 — Condição incompleta não filtra · prova: automática

- **Dado** uma condição com campo escolhido e valor em branco (numa comparação que pede valor)
- **Quando** o filtro é aplicado
- **Então** essa condição fica marcada como incompleta e não muda o resultado

#### CA-B37-14 — Busca por nome e filtro valem juntos · prova: automática

- **Dado** um filtro "Tipo é Lojista" aplicado
- **Quando** a pessoa digita "Maria" na busca
- **Então** aparecem só os lojistas com "Maria" no nome ou telefone

#### CA-B37-15 — A ordenação vale sobre o resultado filtrado · prova: automática

- **Dado** um filtro aplicado
- **Quando** a pessoa escolhe outra ordenação
- **Então** o resultado continua o mesmo conjunto, na ordem escolhida

#### CA-B37-16 — Atendente filtra só dentro dos próprios contatos · prova: automática

- **Dado** um atendente e um contato de outro atendente que satisfaz o filtro
- **Quando** o atendente aplica o filtro
- **Então** esse contato não aparece e não entra na contagem (a regra é conferida no servidor)

#### CA-B37-17 — Contato na lixeira nunca aparece no filtro · prova: automática

- **Dado** um contato na lixeira que satisfaz o filtro
- **Quando** o filtro é aplicado
- **Então** ele não aparece e não entra na contagem

#### CA-B37-18 — Filtrar por etiqueta · prova: automática

- **Dado** contatos com a etiqueta "VIP", com "VIP" e "Atacado", e sem etiqueta
- **Quando** o filtro é "Etiqueta tem VIP", depois "não tem VIP", depois "tem todas de VIP, Atacado"
- **Então** o resultado é, nessa ordem: os dois primeiros; só o sem etiqueta; só o segundo

#### CA-B37-19 — Filtrar por compras · prova: automática

- **Dado** um contato que comprou R$ 6.000 em 3 compras, a última há 70 dias, e outro que nunca comprou
- **Quando** o filtro é "Total já comprado maior que 5.000", depois "Quantidade de compras igual a 3",
  depois "Data da última compra há mais de 60 dias", depois "Data da última compra está vazia"
- **Então** os três primeiros acham só o primeiro contato e o último acha só o que nunca comprou

#### CA-B37-20 — Filtrar por etapa do funil · prova: automática

- **Dado** um contato na etapa "Negociação" do funil de Entrada e outro sem card em funil nenhum
- **Quando** o filtro é "Etapa no funil de Entrada está na etapa Negociação", depois "não está no funil"
- **Então** o primeiro acha só o contato em Negociação e o segundo acha só o que não tem card

#### CA-B37-21 — Filtrar por data de cadastro · prova: automática

- **Dado** contatos cadastrados há 5 e há 40 dias
- **Quando** o filtro é "Data de cadastro nos últimos 30 dias"
- **Então** só aparece o cadastrado há 5 dias

#### CA-B37-22 — Painel do filtro no celular · prova: manual

- **Dado** a lista de contatos aberta no celular
- **Quando** a pessoa abre "Filtrar" e monta dois grupos com condições
- **Então** o painel ocupa a tela, dá para montar e aplicar sem rolar para o lado, e o
  visual segue o estilo Caderno

### Lista de Contatos — filtros salvos

**Descrição:** Admin e Gerente salvam o filtro montado com um nome. Os filtros salvos
valem para a empresa toda e aparecem como botões no topo da lista, ao lado dos botões
fixos de hoje (classificação, tipo, nicho, atendente), que continuam e valem junto com o
filtro avançado (E).

**Componentes:**
- Faixa de filtros salvos no topo da lista, ao lado dos botões fixos: um botão por filtro salvo.
- Ação "Salvar filtro" no painel (só Admin e Gerente).
- Menu de cada filtro salvo: renomear, atualizar com o filtro atual, apagar (só Admin e Gerente).

**Comportamentos:**
- Salvar o filtro montado com um nome.
- Aplicar um filtro salvo com um clique.
- Desligar o filtro salvo clicando de novo.
- Abrir o painel a partir de um filtro salvo e ajustar as condições.
- Atualizar um filtro salvo com as condições ajustadas.
- Renomear um filtro salvo.
- Apagar um filtro salvo.
- Mudar a ordem dos filtros salvos na faixa.

**Critérios de aceite:**

#### CA-B37-23 — Admin ou Gerente salva o filtro com nome · prova: automática

- **Dado** um Admin ou Gerente com um filtro montado
- **Quando** clica em "Salvar filtro" e dá o nome "Lojistas de Fortaleza"
- **Então** aparece um botão "Lojistas de Fortaleza" na faixa do topo da lista

#### CA-B37-24 — Nome repetido é recusado · prova: automática

- **Dado** um filtro salvo "Lojistas de Fortaleza"
- **Quando** alguém tenta salvar outro com o mesmo nome (sem diferença de maiúscula ou acento)
- **Então** a tela avisa que já existe um filtro com esse nome e não salva

#### CA-B37-25 — Clicar no filtro salvo aplica o filtro · prova: automática

- **Dado** o filtro salvo "Lojistas de Fortaleza"
- **Quando** a pessoa clica no botão dele
- **Então** a lista mostra o resultado daquele filtro, o botão fica marcado como ligado e a contagem aparece

#### CA-B37-26 — Clicar de novo desliga o filtro salvo · prova: automática

- **Dado** um filtro salvo ligado
- **Quando** a pessoa clica no botão dele de novo
- **Então** o filtro sai e a lista volta à completa

#### CA-B37-27 — Ajustar e atualizar um filtro salvo · prova: automática

- **Dado** um filtro salvo ligado
- **Quando** um Admin ou Gerente abre o painel, acrescenta uma condição e escolhe "Atualizar filtro salvo"
- **Então** o filtro salvo passa a ter a condição nova para todos da empresa

#### CA-B37-28 — Renomear um filtro salvo · prova: automática

- **Dado** um filtro salvo
- **Quando** um Admin ou Gerente o renomeia para "Lojistas CE"
- **Então** o botão passa a se chamar "Lojistas CE", com as mesmas condições

#### CA-B37-29 — Apagar um filtro salvo pede confirmação · prova: automática

- **Dado** um filtro salvo
- **Quando** um Admin ou Gerente escolhe apagar e confirma
- **Então** o botão some da faixa para todos da empresa; sem confirmar, nada muda

#### CA-B37-30 — Filtro salvo aparece para a empresa toda · prova: automática

- **Dado** um filtro salvo por um Gerente
- **Quando** um Admin e um Atendente da mesma empresa abrem Contatos
- **Então** os dois veem o botão do filtro salvo

#### CA-B37-31 — Atendente usa, mas não salva, renomeia nem apaga · prova: automática

- **Dado** um Atendente
- **Quando** ele abre Contatos
- **Então** ele aplica os filtros salvos, mas não vê "Salvar filtro", renomear, atualizar
  nem apagar; e o servidor recusa essas ações se vierem dele

#### CA-B37-32 — Filtro salvo de outra empresa nunca aparece · prova: automática

- **Dado** um filtro salvo na empresa A
- **Quando** uma pessoa da empresa B abre Contatos ou pede esse filtro diretamente
- **Então** ela não o vê nem consegue usar, renomear ou apagar

#### CA-B37-33 — Filtro salvo com valor que deixou de existir · prova: automática

- **Dado** um filtro salvo "Etiqueta tem VIP", e a etiqueta "VIP" foi apagada
- **Quando** a pessoa aplica o filtro
- **Então** a condição aparece marcada como "valor não existe mais" e o resultado não traz contato por causa dela

#### CA-B37-34 — Botões fixos e filtros salvos convivem · prova: automática

- **Dado** a empresa com um filtro salvo "Lojistas de Fortaleza" e contatos de Fortaleza
  lojistas, com classificação Ativo e Inativo
- **Quando** a pessoa liga o filtro salvo e clica no botão fixo "Ativo"
- **Então** os botões fixos de classificação, tipo, nicho e atendente continuam na tela, e
  o resultado traz só os lojistas de Fortaleza com classificação Ativo; sem filtro salvo
  na empresa, a faixa dos salvos não aparece

#### CA-B37-38 — Admin ou Gerente escolhe a ordem dos filtros salvos · prova: automática

- **Dado** os filtros salvos "A", "B" e "C", nessa ordem
- **Quando** um Admin ou Gerente põe "C" na frente
- **Então** a faixa mostra "C", "A", "B" para todos da empresa; filtro salvo novo entra no
  fim da faixa; o Atendente não consegue mudar a ordem

#### CA-B37-35 — Aprovação visual dos filtros salvos · prova: manual

- **Dado** a empresa de teste com três filtros salvos
- **Quando** a Marcelle abre Contatos no computador e no celular
- **Então** ela aprova a faixa de filtros salvos e o painel no estilo Caderno

## Fora de escopo

- Campos personalizados criados pela empresa: são a série B38. O filtro desta série é
  feito para recebê-los, mas não os cria.
- Grupo dentro de grupo: o filtro tem um nível de grupos (condições dentro de grupos,
  grupos combinados entre si). Não há grupo aninhado em grupo.
- Usar o filtro de contatos em Campanhas, Automações ou Relatórios.
- Exportar o resultado do filtro.
- Ações em massa sobre o resultado (mudar atendente, etiquetar, apagar).
- Filtro salvo pessoal ("só para mim").
- Filtrar a lixeira de contatos.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-01 | As comparações negativas ("não é", "não contém", "não tem", "não está na etapa") trazem também os contatos com o campo vazio. Ex.: "Cidade não é Fortaleza" traz quem não tem cidade. | invalidada | Não trazem. Todo campo que não é obrigatório ganha "está vazio" e "não está vazio" (CA-B37-36, CA-B37-37). Marcelle, 22/10/2026. |
| SUP-B37-02 | A resposta "quero opção da pessoa salvar os filtros, aparecem no local destes rápidos" quer dizer: os botões fixos de hoje saem e, no lugar, ficam os filtros salvos da empresa. | invalidada | Os dois juntos: os botões fixos continuam e os filtros salvos aparecem ao lado (CA-B37-34). Marcelle, 22/10/2026. |
| SUP-B37-03 | Filtro montado e não salvo some ao sair da tela de Contatos. | confirmada | Marcelle, 22/10/2026. |
| SUP-B37-04 | "Total já comprado", "Quantidade de compras" e "Data da última compra" usam as mesmas compras que o card do funil e os Relatórios já contam (compras registradas e pedidos do catálogo fechados). | confirmada | Marcelle, 22/10/2026. |
| SUP-B37-05 | Condição de filtro salvo cujo valor deixou de existir (etiqueta apagada, atendente removido, etapa renomeada) não traz contato por causa dela, em vez de ser ignorada, para o filtro nunca mostrar mais contatos do que deveria. | confirmada | Marcelle, 22/10/2026. |
| SUP-B37-06 | Os filtros salvos aparecem na faixa em ordem alfabética. | invalidada | Admin e Gerente escolhem a ordem, que vale para a empresa toda; filtro novo entra no fim (CA-B37-38). Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-01 | "Campos que vierem a existir" são os que o sistema ganhar ou os que a empresa criar? | respondida | Ambos. Os do sistema entram nesta série; os criados pela empresa viram a série B38. Marcelle, 22/10/2026. |
| PER-B37-02 | Além do cadastro, o filtro usa etiquetas, compras e etapa do funil? | respondida | Sim, os três. Marcelle, 22/10/2026. |
| PER-B37-03 | Como as condições se combinam? | respondida | Grupos que se combinam, com E ou OU dentro e entre os grupos. Marcelle, 22/10/2026. |
| PER-B37-04 | Dá para salvar filtros, e quem vê? | respondida | Sim, filtros salvos com nome, visíveis para a empresa toda. Marcelle, 22/10/2026. |
| PER-B37-05 | Quem pode montar filtros? | respondida | Todos os papéis; o atendente só dentro dos próprios contatos. Marcelle, 22/10/2026. |
| PER-B37-06 | Quem salva, renomeia e apaga filtro salvo? | respondida | Admin e Gerente; o atendente só usa. Marcelle, 22/10/2026. |
| PER-B37-07 | Ao montar o filtro, a lista atualiza na hora ou num botão "Aplicar"? | respondida | Botão "Aplicar": a lista só muda ao aplicar; "Limpar filtro" aplica na hora. Marcelle, 22/10/2026. |
| PER-B37-08 | Em texto, a comparação ignora maiúscula e acento? | respondida | Ignora os dois ("sao paulo" acha "São Paulo"), e a busca por nome passa a ignorar acento também. Marcelle, 22/10/2026. |
