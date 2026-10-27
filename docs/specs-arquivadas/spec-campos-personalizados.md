# Spec: Campos personalizados do contato

> série: B38
> estado: aprovada em 26/10/2026; revisão das colunas e do editor em 26/10/2026 (B38-09)

## Visão Geral

Hoje o contato tem só os campos que o sistema traz: nome, telefone, classificação, tipo,
cidade, UF, perfil de cliente (ICP), atendente e observações. A empresa que precisa
guardar outra informação, como CNPJ, Instagram, porte da loja, limite de crédito ou as
linhas que o cliente compra, acaba escrevendo tudo nas observações. Lá a informação não
se filtra, não entra em automação e não vai para a mensagem.

Esta mudança deixa o Admin e o Gerente criarem os **campos personalizados** da empresa,
em Configurações. Cada campo tem um nome e um destes onze tipos:

| Tipo | O que guarda | Exemplo |
|---|---|---|
| Texto | uma linha de texto | CNPJ, nome da loja |
| Texto longo | texto de várias linhas | endereço de entrega |
| Número | número, com ou sem casas decimais | quantidade de lojas |
| Dinheiro | valor em R$, com centavos | limite de crédito |
| Data | dia, mês e ano | aniversário da loja |
| Lista de opções | uma opção, entre as que a empresa definiu | porte: pequeno, médio, grande |
| Múltipla escolha | várias opções, entre as que a empresa definiu | linhas: jeans, malha, praia |
| Sim/não | sim ou não | tem loja física? |
| Link | endereço de site, que abre ao clicar | Instagram da loja |
| E-mail | e-mail, conferido no formato | e-mail do financeiro |
| Telefone | outro telefone, além do WhatsApp do contato | telefone do financeiro |

Os campos aparecem em todo lugar onde o dado do contato já aparece ou é usado:
- no perfil do contato;
- no painel do contato, no Chat;
- no cadastro de novo contato;
- como colunas da lista de Contatos, todos por padrão, e cada usuário escolhe quais colunas vê;
- no filtro avançado de Contatos e no público das Campanhas, que usa o mesmo filtro;
- nas automações: gatilho "Dado do contato alterado", condição e ação "Alterar dado do contato";
- nas variáveis das mensagens das automações e das campanhas;
- nos Relatórios e no Dashboard: como filtro, numa tabela de vendas por valor do campo e
  como colunas nos Excel que listam clientes ou vendas.

Importar e exportar contatos por planilha, que hoje não existe nem para os campos fixos,
fica para uma série própria, logo depois desta.

Todos os campos são opcionais. O Admin e o Gerente preenchem qualquer contato. O atendente
preenche os campos personalizados dos contatos que atende, mas os dados fixos continuam
só com o Admin e o Gerente, como hoje.

## Páginas / Módulos

### 1. Gerenciar campos personalizados

**Descrição:** tela em Configurações → Campos personalizados, onde o Admin e o Gerente
criam, editam, ordenam e apagam os campos da empresa.

**Componentes:**
- **Lista de campos:** mostra cada campo na ordem escolhida pela empresa, com o nome, o
  tipo e quantos contatos têm valor preenchido. Sem
  nenhum campo, mostra um texto que explica para que servem e o botão de criar.
- **Editor do campo:** tem o nome e o tipo. Nos tipos Lista de opções e Múltipla escolha,
  tem também a lista de opções, com botões para acrescentar, renomear, subir, descer e
  tirar opção. Depois de criado, o tipo aparece só para leitura. No rodapé, os botões
  **Cancelar** e **Salvar**, sempre visíveis: Salvar grava o nome do campo e os nomes de
  opção mudados e fecha o editor; Cancelar fecha sem gravar o que foi digitado.
  Acrescentar, subir, descer e tirar opção gravam na hora, cada um no seu botão.
  (Revisado em 26/10/2026, B38-09: antes o editor tinha a marca "Mostrar na lista de
  Contatos" e o Salvar só aparecia quando o nome mudava.)
- **Variável do campo:** o editor mostra a variável que o campo usa nas mensagens (ex.:
  `{{cnpj}}`).
- **Botões de ordem:** sobem e descem o campo na lista.
- **Confirmação de apagar:** diz quantos contatos têm valor preenchido e avisa que esses
  valores serão perdidos.
- **Aviso de campo em uso:** quando o campo é usado, a tela não apaga e lista onde ele
  está: nome de cada automação, de cada filtro salvo e de cada campanha ainda não enviada.
  O mesmo aviso aparece ao tirar uma opção de lista que está em uso.

**Comportamentos:**
- Criar campo com nome e tipo.
- Criar campo de Lista de opções ou Múltipla escolha com suas opções.
- Renomear campo.
- Acrescentar opção numa lista.
- Renomear opção.
- Mudar a ordem das opções.
- Tirar opção de uma lista.
- Tentar tirar opção em uso e ver onde ela é usada.
- Salvar o editor pelo botão Salvar, ou fechar sem gravar pelo Cancelar.
- Mudar a ordem dos campos.
- Apagar campo que não está em uso.
- Tentar apagar campo em uso e ver onde ele é usado.
- Ver a variável do campo.
- Atendente não vê a tela.

**Critérios de aceite:**

#### CA-B38-01 — Admin cria um campo de texto · prova: automática

- **Dado** um Admin em Configurações → Campos personalizados, sem nenhum campo criado
- **Quando** ele cria o campo "CNPJ" do tipo Texto
- **Então** o campo aparece na lista com o tipo "Texto" e "0 contatos preenchidos"

#### CA-B38-02 — Gerente também cria e edita campos · prova: automática

- **Dado** um Gerente na mesma tela
- **Quando** ele cria o campo "Instagram" do tipo Link e depois o renomeia para "Instagram da loja"
- **Então** o campo aparece na lista com o nome novo

#### CA-B38-03 — Atendente não gerencia campos · prova: automática

- **Dado** um Atendente
- **Quando** ele abre o menu de Configurações ou entra direto no endereço da tela de campos
- **Então** a opção "Campos personalizados" não aparece no menu, o endereço o leva de volta, e o
  servidor recusa criar, editar, ordenar ou apagar campo pedido em nome dele

#### CA-B38-04 — Os onze tipos podem ser criados · prova: automática

- **Dado** um Admin na tela de campos
- **Quando** ele abre a escolha de tipo
- **Então** aparecem Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla
  escolha, Sim/não, Link, E-mail e Telefone, e um campo de cada tipo pode ser criado

#### CA-B38-05 — Lista de opções exige ao menos uma opção · prova: automática

- **Dado** um Admin criando um campo do tipo Lista de opções ou Múltipla escolha
- **Quando** ele tenta salvar sem nenhuma opção, ou com duas opções de mesmo nome
- **Então** a tela avisa o problema e o campo não é criado

#### CA-B38-06 — Nome de campo não se repete · prova: automática

- **Dado** a empresa já tem o campo "CNPJ"
- **Quando** alguém tenta criar ou renomear outro campo para "cnpj" ou "CNPJ " (mesmo nome, com
  outra caixa ou espaço)
- **Então** a tela avisa que já existe um campo com esse nome e nada é salvo

#### CA-B38-07 — Nome de campo não pode ser o de um dado fixo · prova: automática

- **Dado** um Admin criando um campo
- **Quando** ele dá ao campo o nome de um dado fixo do contato, como "Cidade" ou "Telefone"
- **Então** a tela avisa que esse nome já é de um dado do sistema e o campo não é criado

#### CA-B38-08 — Tipo não muda depois de criado · prova: automática

- **Dado** o campo "Quantidade de lojas", do tipo Número
- **Quando** o Admin abre o editor do campo
- **Então** o tipo aparece só para leitura, e um pedido ao servidor para mudar o tipo é recusado

#### CA-B38-09 — Editar as opções da lista · prova: automática

- **Dado** o campo "Porte", Lista de opções com "Pequeno", "Médio" e "Grande"
- **Quando** o Gerente acrescenta "Rede", renomeia "Médio" para "Médio porte" e põe "Grande" em primeiro
- **Então** o campo passa a oferecer "Grande", "Pequeno", "Médio porte" e "Rede", nessa ordem, e o
  contato que tinha "Médio" passa a mostrar "Médio porte"

#### CA-B38-10 — Tirar opção que contatos usam · prova: automática

- **Dado** o campo "Porte" com a opção "Rede", 3 contatos com "Rede", e nenhuma automação, filtro
  salvo ou campanha não enviada usando "Rede"
- **Quando** o Admin tira a opção "Rede"
- **Então** a tela avisa que 3 contatos perdem esse valor e pede confirmação; ao confirmar, os 3
  ficam com o campo vazio (e, em Múltipla escolha, só perdem essa opção, mantendo as outras)

#### CA-B38-45 — Opção em uso não pode ser tirada · prova: automática

- **Dado** a automação "Atacado em rede" com a condição "Porte é qualquer um de Rede"
- **Quando** o Admin tenta tirar a opção "Rede" do campo "Porte"
- **Então** a tela não tira e mostra "Usado em" com o nome da automação; depois que a condição deixa
  de usar "Rede", a opção pode ser tirada

#### CA-B38-11 — Mudar a ordem dos campos · prova: automática

- **Dado** os campos "CNPJ", "Porte" e "Instagram da loja", nessa ordem
- **Quando** o Admin sobe "Instagram da loja" duas vezes
- **Então** a ordem passa a ser "Instagram da loja", "CNPJ", "Porte" na tela de campos, no perfil do
  contato, no painel do Chat e no cadastro de novo contato

#### CA-B38-12 — Apagar campo que não está em uso · prova: automática

- **Dado** o campo "Aniversário da loja", que 4 contatos preencheram e que nenhuma automação,
  filtro salvo ou campanha não enviada usa
- **Quando** o Admin pede para apagar
- **Então** a confirmação avisa que 4 contatos perderão esse valor; ao confirmar, o campo some de
  todas as telas e os valores são apagados; ao desistir, nada muda

#### CA-B38-13 — Campo em uso não pode ser apagado · prova: automática

- **Dado** o campo "Porte", usado na automação "Boas-vindas atacado", no filtro salvo de Contatos
  "Lojas grandes" e na campanha agendada "Promoção de março"
- **Quando** o Admin pede para apagar
- **Então** a tela não apaga e mostra a lista "Usado em": a automação, o filtro salvo e a campanha,
  pelo nome; depois que o campo sai dos três, ele pode ser apagado

#### CA-B38-14 — Variável do campo · prova: automática

- **Dado** o Admin cria o campo "Limite de crédito"
- **Quando** ele abre o editor do campo
- **Então** a tela mostra a variável `{{limite_de_credito}}`

#### CA-B38-46 — Renomear o campo troca a variável nos textos · prova: automática

- **Dado** o campo "Limite de crédito", com `{{limite_de_credito|a combinar}}` no texto de uma
  automação e de uma campanha agendada
- **Quando** o Admin renomeia o campo para "Limite"
- **Então** o editor do campo mostra `{{limite}}`, os dois textos passam a ter
  `{{limite|a combinar}}` no lugar da variável antiga, com o mesmo texto reserva, e a mensagem
  enviada depois sai com o valor do campo; campanha já enviada não muda

#### CA-B38-15 — Tela de campos sem nenhum campo · prova: automática

- **Dado** uma empresa sem campos personalizados
- **Quando** o Admin abre a tela
- **Então** a tela explica para que servem os campos e mostra o botão "Criar campo"

#### CA-B38-16 — Aprovação visual da tela de campos · prova: manual

- **Dado** a tela de campos com campos de vários tipos
- **Quando** a Marcelle a abre no computador e no celular, nos temas claro e escuro
- **Então** ela aprova a lista, o editor, as opções e os avisos no estilo Caderno, sem nada
  desalinhado, cortado ou ilegível

#### CA-B38-67 — Editor salva pelo botão Salvar · prova: automática

- **Dado** o editor do campo "Porte" aberto, com a opção "Pequeno"
- **Quando** o Admin muda o nome para "Porte da loja" e a opção para "Pequena" e clica Salvar
- **Então** os dois nomes são gravados e o editor fecha; se ele tivesse clicado Cancelar, o
  editor fecharia e nada seria gravado

### 2. Campos no perfil do contato

**Descrição:** o perfil do contato (`/contatos/[id]`) ganha o bloco "Campos personalizados",
com os campos da empresa na ordem escolhida.

**Componentes:**
- **Bloco "Campos personalizados":** cada campo com o nome e o valor. Campo vazio mostra "—".
  Link abre em outra aba; e-mail abre o programa de e-mail; telefone fica pronto para copiar.
- **Edição dos campos:** quem pode editar vê o botão "Editar" no bloco, que abre cada campo no
  controle do seu tipo (caixa de texto, data, lista, caixas de marcar, sim/não).

**Comportamentos:**
- Ver os campos e seus valores.
- Preencher um campo vazio.
- Trocar o valor de um campo.
- Apagar o valor de um campo.
- Abrir o link ou o e-mail de um campo.
- Ser avisado de valor fora do formato.

**Critérios de aceite:**

#### CA-B38-17 — Perfil mostra os campos na ordem da empresa · prova: automática

- **Dado** a empresa com os campos "CNPJ", "Porte" e "Instagram da loja", e um contato com CNPJ e
  Porte preenchidos
- **Quando** alguém abre o perfil do contato
- **Então** o bloco "Campos personalizados" mostra os três, nessa ordem, com os dois valores e "—"
  no Instagram

#### CA-B38-18 — Admin e Gerente preenchem qualquer contato · prova: automática

- **Dado** um Gerente no perfil de um contato que não é da carteira dele
- **Quando** ele preenche "Porte" com "Grande" e salva
- **Então** o perfil mostra "Grande", e o valor está lá ao recarregar a página

#### CA-B38-19 — Atendente preenche os campos dos contatos que atende · prova: automática

- **Dado** um Atendente no perfil de um contato que ele atende
- **Quando** ele preenche "CNPJ" e salva
- **Então** o valor fica salvo, e os dados fixos (tipo, cidade, UF e os demais) continuam sem botão
  de editar para ele

#### CA-B38-20 — Atendente não preenche contato de outro · prova: automática

- **Dado** um contato que o Atendente não atende
- **Quando** chega ao servidor um pedido de alteração de campo personalizado em nome desse Atendente
- **Então** o servidor recusa e o valor não muda

#### CA-B38-21 — Cada tipo confere o formato · prova: automática

- **Dado** um Admin editando os campos de um contato
- **Quando** ele digita "abc" em Número, "12,345" em Dinheiro, "fulano@" em E-mail, "não é link" em
  Link ou "123" em Telefone
- **Então** a tela aponta o campo com o problema e não salva; o servidor também recusa esses valores
  se chegarem sem passar pela tela

#### CA-B38-22 — Valores aparecem no formato de cada tipo · prova: automática

- **Dado** um contato com Dinheiro 1500,5, Data 03/04/2026, Sim/não marcado como sim, Múltipla
  escolha com "Jeans" e "Malha", e um Link
- **Quando** alguém abre o perfil
- **Então** aparece "R$ 1.500,50", "03/04/2026", "Sim", "Jeans, Malha" e o link clicável, que abre em
  outra aba

#### CA-B38-23 — Apagar o valor de um campo · prova: automática

- **Dado** um contato com "Porte" igual a "Grande"
- **Quando** o Admin apaga o valor e salva
- **Então** o perfil mostra "—" no Porte

#### CA-B38-24 — Empresa sem campos não mostra o bloco · prova: automática

- **Dado** uma empresa sem campos personalizados
- **Quando** alguém abre o perfil de um contato
- **Então** o bloco "Campos personalizados" não aparece

#### CA-B38-25 — Aprovação visual do bloco no perfil · prova: manual

- **Dado** um contato com campos de todos os tipos, alguns vazios
- **Quando** a Marcelle abre o perfil no computador e no celular, nos temas claro e escuro, e edita
  os campos
- **Então** ela aprova o bloco e a edição, sem nada desalinhado, cortado ou ilegível

### 3. Campos no painel do contato, no Chat

**Descrição:** o painel do contato, ao lado da conversa, mostra os campos personalizados
abaixo dos dados que já mostra, e deixa preencher sem sair da conversa.

**Componentes:**
- **Seção "Campos personalizados":** cada campo com o nome, o valor e o lápis de editar, do mesmo
  jeito que tipo e cidade são editados hoje no painel.

**Comportamentos:**
- Ver os campos do contato da conversa.
- Preencher ou trocar um campo pelo painel.

**Critérios de aceite:**

#### CA-B38-26 — Painel do Chat mostra e edita os campos · prova: automática

- **Dado** uma conversa aberta com um contato que tem "CNPJ" preenchido
- **Quando** o Atendente da conversa abre o painel do contato, edita "Porte" para "Pequeno" e salva
- **Então** o painel mostra o CNPJ e o Porte "Pequeno", e o perfil do contato mostra o mesmo Porte

#### CA-B38-27 — Aprovação visual do painel do Chat · prova: manual

- **Dado** uma conversa com um contato que tem campos de vários tipos
- **Quando** a Marcelle abre o painel do contato no computador e no celular, nos temas claro e escuro
- **Então** ela aprova a seção, sem nada desalinhado, cortado ou ilegível

### 4. Campos no cadastro de novo contato

**Descrição:** o formulário "Novo contato" mostra os campos personalizados depois dos dados
fixos, todos opcionais.

**Comportamentos:**
- Cadastrar contato preenchendo campos personalizados.
- Cadastrar contato sem preencher nenhum campo personalizado.

**Critérios de aceite:**

#### CA-B38-28 — Cadastro com campos personalizados · prova: automática

- **Dado** o Admin no formulário de Novo contato, numa empresa com os campos "CNPJ" e "Porte"
- **Quando** ele preenche nome, telefone, CNPJ e Porte e salva
- **Então** o contato é criado e o perfil dele mostra o CNPJ e o Porte

#### CA-B38-29 — Campos personalizados não são obrigatórios · prova: automática

- **Dado** o mesmo formulário
- **Quando** o Admin preenche só nome e telefone e salva
- **Então** o contato é criado, com os campos personalizados vazios

#### CA-B38-30 — Valor fora do formato no cadastro · prova: automática

- **Dado** o formulário de Novo contato com o campo "E-mail do financeiro"
- **Quando** o Admin digita "fulano@" e tenta salvar
- **Então** a tela aponta o campo e o contato não é criado

### 5. Campos no filtro de Contatos e no público das Campanhas

**Descrição:** o filtro avançado (o de Contatos e o do público das Campanhas) ganha o assunto
"Campos personalizados", com os campos da empresa e as comparações de cada tipo.

**Componentes:**
- **Assunto "Campos personalizados"** na escolha de campo do filtro, com os campos na ordem da empresa.
- **Comparações por tipo:**

| Tipo | Comparações |
|---|---|
| Texto, Texto longo, Link, E-mail, Telefone | contém, não contém, é, não é, está vazio, não está vazio |
| Número, Dinheiro | é igual a, maior que, menor que, entre, está vazio, não está vazio |
| Data | antes de, depois de, entre, nos últimos N dias, há mais de N dias, está vazio, não está vazio |
| Lista de opções | é qualquer um de, não é nenhum de, está vazio, não está vazio |
| Múltipla escolha | tem qualquer um de, tem todos de, não tem nenhum de, está vazio, não está vazio |
| Sim/não | é sim, é não, está vazio |

**Comportamentos:**
- Filtrar contatos por um campo personalizado.
- Combinar campo personalizado com outros campos, em grupos E/OU.
- Salvar filtro com campo personalizado.
- Escolher o público de uma campanha por campo personalizado.

**Critérios de aceite:**

#### CA-B38-31 — Filtrar por campo de lista · prova: automática

- **Dado** 5 contatos com "Porte" igual a "Grande", 3 com "Pequeno" e 4 sem valor
- **Quando** o Admin filtra Contatos por "Porte é qualquer um de Grande"
- **Então** aparecem os 5 contatos e a contagem mostra 5; com "Porte está vazio", aparecem os 4

#### CA-B38-32 — Cada tipo filtra com as suas comparações · prova: automática

- **Dado** contatos com valores em campos de cada tipo
- **Quando** o filtro usa cada comparação da tabela acima
- **Então** cada uma traz exatamente os contatos esperados, e "não é", "não contém" e "não tem
  nenhum de" não trazem quem está com o campo vazio

#### CA-B38-33 — Campo personalizado combina com os outros · prova: automática

- **Dado** contatos com Porte "Grande" em SP e em MG
- **Quando** o filtro é "Porte é qualquer um de Grande" E "UF é qualquer um de SP"
- **Então** aparecem só os de SP com Porte Grande

#### CA-B38-34 — Filtro salvo com campo personalizado · prova: automática

- **Dado** o Gerente salva o filtro "Lojas grandes" com "Porte é qualquer um de Grande"
- **Quando** qualquer pessoa da empresa abre esse filtro salvo
- **Então** ele traz os mesmos contatos, e renomear o campo ou a opção não muda o resultado

#### CA-B38-35 — Público de campanha por campo personalizado · prova: automática

- **Dado** uma campanha nova
- **Quando** o Admin escolhe o público "Porte é qualquer um de Grande"
- **Então** a contagem do público e a lista de quem recebe trazem os mesmos contatos que o filtro de
  Contatos traz

#### CA-B38-36 — Filtro do atendente continua só na carteira dele · prova: automática

- **Dado** um Atendente que só vê os contatos que atende
- **Quando** ele filtra por um campo personalizado
- **Então** o resultado traz só contatos que ele já podia ver

### 6. Campos nas automações

**Descrição:** os três blocos de automação que já falam do dado do contato passam a oferecer
também os campos personalizados.

**Componentes:**
- **Gatilho "Dado do contato alterado":** a escolha de campo ganha os campos personalizados; o
  "valor novo (opcional)" usa o controle do tipo do campo.
- **Condição "Campo personalizado":** escolhe o campo, a comparação (as mesmas do filtro) e o valor;
  tem as saídas sim e não, como as outras condições.
- **Ação "Alterar dado do contato":** a escolha de campo ganha os campos personalizados, e o valor
  usa o controle do tipo do campo.

**Comportamentos:**
- Disparar automação quando um campo personalizado muda.
- Disparar só quando o campo muda para um valor escolhido.
- Seguir pela saída sim ou não conforme o valor de um campo personalizado.
- Preencher um campo personalizado por automação.

**Critérios de aceite:**

#### CA-B38-37 — Gatilho dispara quando o campo muda · prova: automática

- **Dado** a automação ligada com o gatilho "Dado do contato alterado", campo "Porte", valor novo "Grande"
- **Quando** alguém muda o Porte de um contato para "Grande", pelo perfil, pelo Chat ou por outra automação
- **Então** a automação roda para esse contato; mudar para "Pequeno" ou salvar o mesmo valor de
  antes não a faz rodar

#### CA-B38-38 — Condição pelo campo personalizado · prova: automática

- **Dado** a automação com a condição "Porte é qualquer um de Grande"
- **Quando** ela roda para um contato com Porte "Grande" e para outro sem Porte
- **Então** o primeiro segue pela saída sim e o segundo pela saída não, e o histórico mostra a
  condição e o caminho de cada um

#### CA-B38-39 — Ação preenche o campo personalizado · prova: automática

- **Dado** a automação com a ação "Alterar dado do contato", campo "Cliente VIP" (Sim/não), valor sim
- **Quando** ela roda para um contato
- **Então** o perfil do contato mostra "Cliente VIP: Sim"

#### CA-B38-40 — Valor da ação conferido pelo tipo · prova: automática

- **Dado** o editor de automação com a ação "Alterar dado do contato" no campo "Limite de crédito" (Dinheiro)
- **Quando** o Admin digita "muito" no valor e tenta salvar a automação
- **Então** o editor aponta o valor e não salva

#### CA-B38-62 — Cada automação roda uma vez por sequência · prova: automática

- **Dado** a automação A ("quando Porte mudar para Grande, mudar Porte para Pequeno") e a automação B ("quando Porte mudar para Pequeno, mudar Porte para Grande"), as duas ligadas
- **Quando** alguém muda o Porte de um contato para Grande
- **Então** A roda, B roda e A não roda de novo: a sequência termina, o histórico mostra a segunda vez de A como "Não rodou: já rodou nesta sequência de mudanças", e o contato fica com Porte Grande

### 7. Campos nas variáveis das mensagens

**Descrição:** o texto da ação "Enviar mensagem" das automações e o texto das campanhas
aceitam a variável de cada campo personalizado, ao lado de `{{nome_contato}}`,
`{{primeiro_nome}}` e `{{nome_vendedor}}`.

**Componentes:**
- **Botões de variável:** ganham um botão por campo personalizado, com o nome do campo, que insere
  a variável no ponto do cursor.
- **Texto reserva:** ao inserir qualquer variável, dos campos personalizados ou das que já existem
  (`{{nome_contato}}`, `{{primeiro_nome}}`, `{{nome_vendedor}}`), a pessoa pode escrever um
  texto reserva, **obrigatório**, que vai no lugar da variável quando o dado do contato está vazio.
  A variável com reserva aparece no texto com o reserva junto (ex.: `{{limite_de_credito|a combinar}}`).

**Comportamentos:**
- Inserir a variável de um campo no texto.
- Inserir a variável com um texto reserva.
- Ser impedido de salvar texto com variável sem reserva.
- Corrigir texto antigo que tem variável sem reserva.
- Enviar mensagem com o valor do campo no lugar da variável.
- Enviar mensagem com o texto reserva quando o campo está vazio.

**Critérios de aceite:**

#### CA-B38-41 — Botão de variável do campo · prova: automática

- **Dado** o editor de automação, na ação "Enviar mensagem", numa empresa com o campo "Limite de crédito"
- **Quando** o Admin clica no botão "Limite de crédito" com o cursor no meio do texto
- **Então** a tela pede o texto reserva antes de inserir a variável; o mesmo vale no texto da campanha

#### CA-B38-42 — Mensagem sai com o valor do campo · prova: automática

- **Dado** o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato com Limite de crédito 1500
- **Quando** a automação ou a campanha envia a mensagem para ele
- **Então** a mensagem sai como "Seu limite é R$ 1.500,00", com o valor no formato do tipo

#### CA-B38-43 — Campo vazio usa o texto reserva · prova: automática

- **Dado** o texto "Seu limite é {{limite_de_credito|a combinar}}" e um contato sem Limite de crédito
- **Quando** a automação ou a campanha envia a mensagem para ele
- **Então** a mensagem sai como "Seu limite é a combinar"

#### CA-B38-48 — Variável sem texto reserva não é aceita · prova: automática

- **Dado** o editor do texto de uma automação ou de uma campanha
- **Quando** o Admin tenta inserir uma variável sem texto reserva, ou escreve à mão
  "Seu limite é {{limite_de_credito}}" ou "Olá {{nome_contato}}" e tenta salvar
- **Então** a tela não insere a variável sem reserva e não salva o texto, apontando cada variável
  que está sem reserva; o servidor também recusa esse texto se ele chegar sem passar pela tela

#### CA-B38-49 — Inserir variável com texto reserva · prova: automática

- **Dado** o editor do texto de uma automação ou de uma campanha
- **Quando** o Admin clica no botão "Limite de crédito" e escreve "a combinar" como texto reserva
- **Então** o texto ganha `{{limite_de_credito|a combinar}}` no ponto do cursor

#### CA-B38-60 — Texto reserva nas variáveis que já existem · prova: automática

- **Dado** o texto "Olá {{nome_contato|cliente}}, aqui é {{nome_vendedor|a equipe}}", um contato
  sem nome e um contato sem atendente
- **Quando** a automação ou a campanha envia a mensagem para os dois
- **Então** o contato sem nome recebe "Olá cliente, aqui é …" (na automação, o reserva vai no
  lugar do telefone que sai hoje) e o contato sem atendente recebe "… aqui é a equipe"; com nome e
  atendente preenchidos, a mensagem sai com o nome e o vendedor, como hoje; o mesmo vale para
  `{{primeiro_nome}}` nas automações

#### CA-B38-61 — Textos antigos sem reserva ficam marcados · prova: automática

- **Dado** uma automação ou uma campanha não enviada salva antes desta mudança, com
  `{{nome_contato}}` sem reserva
- **Quando** o Admin abre a lista de automações, a lista de campanhas ou o editor desse texto
- **Então** a automação ou a campanha aparece marcada "precisa de ajuste", o editor aponta a
  variável sem reserva, e ela só volta a enviar depois que o texto ganha o reserva e é salvo

#### CA-B38-63 — Mensagem rápida exige texto reserva · prova: automática

- **Dado** a tela de mensagens rápidas, em Configurações
- **Quando** o Admin escreve "Olá {{nome_contato}}" e tenta salvar, ou insere uma variável pelo botão
- **Então** a tela não salva o texto sem reserva e aponta a variável; pelo botão, pede o texto reserva antes de inserir; com "Olá {{nome_contato|cliente}}", salva; a mensagem rápida antiga sem reserva aparece marcada "precisa de ajuste" na lista e não é enviada por automação até ganhar o reserva

#### CA-B38-64 — Lembrete da automação exige texto reserva · prova: automática

- **Dado** a ação "Criar lembrete na Agenda" de uma automação
- **Quando** o texto do lembrete tem "Ligar para {{primeiro_nome}}", sem reserva, e o Admin tenta salvar
- **Então** o editor aponta a variável e o servidor não salva; com "Ligar para {{primeiro_nome|o cliente}}", o lembrete do contato sem nome nasce como "Ligar para o cliente"

### 8. Campos nos Relatórios e no Dashboard

**Descrição:** os Relatórios e o Dashboard ganham um filtro por campo personalizado; a aba
Visão Geral ganha a tabela "Vendas por campo"; e os Excel que listam clientes ou vendas
ganham uma coluna por campo personalizado.

**Componentes:**
- **Filtro "Campo personalizado":** ao lado do filtro de atendente, nas abas dos Relatórios e no
  Dashboard. Escolhe um campo e um ou mais valores; só os clientes com esses valores entram nos
  números, gráficos e listas da tela.
- **Tabela "Vendas por campo":** na Visão Geral, abaixo de "Variação por UF", com o mesmo formato
  dela, mas agrupada pelos valores do campo escolhido, mais a linha "Sem valor". Tem Exportar Excel.
- **Colunas nos Excel:** a lista de clientes do RFV, as Vendas da Visão Geral e os Pedidos do
  catálogo ganham uma coluna por campo personalizado, na ordem da empresa.

**Comportamentos:**
- Filtrar uma aba dos Relatórios por campo personalizado.
- Filtrar o Dashboard por campo personalizado.
- Escolher o campo da tabela "Vendas por campo".
- Exportar a tabela "Vendas por campo".
- Baixar um Excel com as colunas dos campos personalizados.

**Critérios de aceite:**

#### CA-B38-50 — Filtro por campo nos Relatórios · prova: automática

- **Dado** clientes com Porte "Grande" e "Pequeno", com compras no mês
- **Quando** o Admin abre a Visão Geral e filtra "Porte: Grande"
- **Então** os cartões, os gráficos e a lista de vendas contam só as compras dos clientes com Porte
  Grande; o mesmo filtro vale nas abas RFV, Recompra por coorte, Funil de clientes e Carteiras

#### CA-B38-51 — Filtro por campo no RFV não muda o perfil · prova: automática

- **Dado** um cliente com Porte "Grande" e o perfil "Campeões" na aba RFV sem filtro
- **Quando** o Admin filtra o RFV por "Porte: Grande"
- **Então** o cliente aparece com o mesmo perfil e as mesmas notas R, F e V, e a matriz conta só os
  clientes com Porte Grande

#### CA-B38-52 — Filtro por campo no Dashboard · prova: automática

- **Dado** o Dashboard com clientes de Porte "Grande" e "Pequeno"
- **Quando** o Admin filtra "Porte: Grande"
- **Então** os números do Dashboard contam só os contatos com Porte Grande

#### CA-B38-53 — Filtro por campo junto com o de atendente · prova: automática

- **Dado** o Atendente Teste com clientes de Porte "Grande" e "Pequeno"
- **Quando** o Admin filtra pelo Atendente Teste e por "Porte: Grande", ou o próprio atendente filtra por "Porte: Grande"
- **Então** a tela conta só os clientes da carteira dele com Porte Grande

#### CA-B38-54 — Tabela de vendas por campo · prova: automática

- **Dado** compras no mês de clientes com Porte "Grande", "Pequeno" e sem Porte
- **Quando** o Admin escolhe "Porte" na tabela "Vendas por campo"
- **Então** a tabela mostra uma linha para Grande, uma para Pequeno e uma para "Sem valor", cada uma
  com os mesmos números que a Variação por UF mostra para uma UF, e o total bate com o cartão
  "Faturamento líquido"

#### CA-B38-55 — Exportar a tabela de vendas por campo · prova: automática

- **Dado** a tabela "Vendas por campo" com o Porte escolhido
- **Quando** o Admin clica em Exportar Excel
- **Então** o arquivo tem as mesmas linhas e números da tabela

#### CA-B38-56 — Excel com as colunas dos campos · prova: automática

- **Dado** a empresa com os campos "CNPJ" e "Porte", e clientes com esses campos preenchidos
- **Quando** o Admin baixa o Excel da lista do RFV, das Vendas da Visão Geral ou dos Pedidos do catálogo
- **Então** cada arquivo tem as colunas "CNPJ" e "Porte", na ordem da empresa, com o valor de cada
  cliente no formato do tipo, e vazio quando o cliente não tem valor

#### CA-B38-57 — Aprovação visual nos Relatórios e no Dashboard · prova: manual

- **Dado** os Relatórios e o Dashboard com o filtro por campo e a tabela "Vendas por campo"
- **Quando** a Marcelle os abre no computador e no celular, nos temas claro e escuro
- **Então** ela aprova o filtro e a tabela, sem nada desalinhado, cortado ou ilegível

### 9. Colunas na lista de Contatos

**Descrição:** todo campo vira coluna da lista, depois de "Cidade", na ordem da empresa, sem
ninguém precisar marcar nada. Acima da lista, o botão **Colunas** abre a lista de colunas com
uma marca em cada uma: a pessoa liga e desliga as que quer ver. O Nome fica sempre. A escolha
é de cada usuário, fica guardada para ele (vale em qualquer aparelho) e não muda a tela de
ninguém mais. Campo criado depois aparece ligado para todos, mesmo para quem já escolheu
colunas. A coluna Atendente continua só para Admin e Gerente.

> Revisado em 26/10/2026 (B38-09), depois do teste manual CA-B38-59. Antes: a empresa marcava
> "Mostrar na lista de Contatos" no campo, e todos viam as mesmas colunas.

**Comportamentos:**
- Ver os valores de todos os campos na lista.
- Esconder e mostrar de novo qualquer coluna, menos o Nome, pelo botão Colunas.

**Critérios de aceite:**

#### CA-B38-47 — Todo campo vira coluna · prova: automática

- **Dado** os campos "CNPJ" e "Porte", nessa ordem
- **Quando** qualquer pessoa da empresa abre Contatos
- **Então** a lista tem as colunas "CNPJ" e "Porte", depois de "Cidade", nessa ordem, sem ninguém
  ter marcado nada

> Revisado em 26/10/2026 (B38-09). Antes: só o campo marcado com "Mostrar na lista de Contatos"
> virava coluna.

#### CA-B38-65 — Cada usuário esconde as próprias colunas · prova: automática

- **Dado** o Admin e o Atendente da mesma empresa, com os campos "CNPJ" e "Porte"
- **Quando** o Admin desliga "CNPJ" e "Cidade" no botão Colunas e abre Contatos de novo
- **Então** a lista do Admin não tem as colunas "CNPJ" e "Cidade", e a do Atendente tem; quando o
  Admin liga "CNPJ" de novo, a coluna volta para ele

#### CA-B38-66 — Nome fica sempre e campo novo aparece ligado · prova: automática

- **Dado** o Admin com a coluna "CNPJ" desligada
- **Quando** ele abre o botão Colunas, e depois cria o campo "Instagram da loja"
- **Então** o Nome não está entre as colunas que dá para desligar, e a coluna "Instagram da loja"
  aparece na lista dele sem ele mexer no botão Colunas, com o "CNPJ" ainda escondido

#### CA-B38-58 — Coluna mostra o valor no formato do tipo · prova: automática

- **Dado** o campo "Limite de crédito" (Dinheiro), e um contato com 1500
- **Quando** alguém abre Contatos
- **Então** a coluna "Limite de crédito" mostra "R$ 1.500,00" nesse contato e "—" em quem não tem valor

#### CA-B38-59 — Aprovação visual das colunas · prova: manual

- **Dado** a lista de Contatos com três campos
- **Quando** a Marcelle a abre no computador e no celular, nos temas claro e escuro, e liga e
  desliga colunas pelo botão Colunas
- **Então** ela aprova as colunas e o botão Colunas, sem nada desalinhado, cortado ou ilegível

### 10. Isolamento entre empresas

**Descrição:** os campos e seus valores são da empresa que os criou.

**Critérios de aceite:**

#### CA-B38-44 — Uma empresa não vê os campos da outra · prova: automática

- **Dado** a empresa A com o campo "CNPJ" e a empresa B sem campos
- **Quando** um usuário da empresa B abre a tela de campos, um perfil de contato e o filtro, ou faz
  um pedido ao servidor com o campo da empresa A
- **Então** ele não vê o campo nem os valores da empresa A, e o pedido é recusado

## Fora de escopo

- Campos personalizados em outras coisas além do contato (card do funil, pedido, produto,
  usuário).
- Campo obrigatório: todos os campos são opcionais.
- Mudar o tipo de um campo depois de criado.
- Importar e exportar contatos por planilha: vira uma série própria, logo depois desta, com
  os campos fixos e os personalizados.
- Mudar a ordem das colunas da lista de Contatos: a ordem é a de hoje, com os campos na ordem da empresa.
- Filtro por mais de um campo personalizado ao mesmo tempo nos Relatórios e no Dashboard.
- Trocar as variáveis da mensagem rápida quando o atendente a escolhe no Chat: hoje o texto entra como está, e continua assim.
- Tipos além dos onze da tabela (arquivo, endereço com mapa, campo calculado, usuário, data e hora).
- Campos personalizados no catálogo da loja.
- Permissão por campo (campo que só alguns papéis veem ou editam).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-01 | "Contato que o atendente atende" é o contato que o atendente já consegue ver hoje (carteira dele ou conversa atribuída a ele). A regra de quem ele vê não muda. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-02 | "Em uso", para bloquear o apagar, é: automação (ligada ou desligada) que usa o campo no gatilho, numa condição, numa ação ou como variável no texto; filtro salvo de Contatos ou de Campanhas; campanha em rascunho ou agendada que usa o campo no público ou como variável no texto. Campanha já enviada não conta. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-03 | A variável nasce do nome no dia em que o campo é criado (minúsculo, sem acento, espaço vira "_") e não muda ao renomear. | invalidada | A variável acompanha o nome, para não confundir; ao renomear, o sistema troca a variável nos textos das automações e das campanhas não enviadas (CA-B38-46). Marcelle, 26/10/2026. |
| SUP-B38-04 | Campo vazio na mensagem sai como texto vazio, sem impedir o envio. | invalidada | A variável pode ter um texto reserva, usado quando o campo está vazio; o reserva é obrigatório (CA-B38-43, CA-B38-48). Marcelle, 26/10/2026. |
| SUP-B38-05 | Sim/não tem três estados: sim, não e vazio (nunca preenchido). No filtro, "é não" não traz o vazio. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-06 | Limite de 50 campos por empresa e de 50 opções por lista; o nome do campo e da opção tem até 40 letras. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-07 | Telefone extra aceita número brasileiro com DDD (10 ou 11 dígitos) ou internacional começando com "+"; é guardado só com os dígitos e mostrado formatado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-08 | Link aceita endereço com ou sem "https://"; sem, o sistema completa com "https://". | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-09 | Contato que vai para a lixeira guarda os valores e os recupera ao ser restaurado. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-10 | Tirar opção de uma lista que uma automação, filtro salvo ou campanha não enviada usa segue a mesma regra do apagar: a tela bloqueia e mostra onde a opção é usada. | confirmada | Marcelle, 26/10/2026 (CA-B38-45). |
| SUP-B38-11 | Mudança em campo personalizado feita pelo atendente não aparece em nenhum histórico além do histórico de automações (quando dispara uma); não há registro de "quem mudou o quê" nesta série. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-12 | A variável nova, depois de renomear, não pode colidir com outra: se o nome novo gerar a variável de outro campo ou de uma variável fixa, a tela recusa o nome. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-13 | O filtro por campo nos Relatórios e no Dashboard escolhe um campo por vez. Campos de texto, número e data filtram com uma comparação simples (é, entre); Lista, Múltipla escolha e Sim/não escolhem os valores. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-14 | A tabela "Vendas por campo" oferece só campos de Lista de opções, Múltipla escolha e Sim/não. Em Múltipla escolha, a venda de um cliente com duas opções conta nas duas linhas, e a tela avisa que a soma das linhas pode passar do total. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-15 | O filtro por campo no RFV segue a regra da B33-04: o perfil é sempre calculado com a empresa toda e o filtro só escolhe quem aparece (CA-B38-51). | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-16 | O texto reserva vale só para as variáveis dos campos personalizados. | invalidada | Vale para todas as variáveis, inclusive `{{nome_contato}}`, `{{primeiro_nome}}` e `{{nome_vendedor}}` (CA-B38-60). Marcelle, 26/10/2026. |
| SUP-B38-17 | Nas variáveis que já existem, sem texto reserva tudo fica como hoje: na automação, contato sem nome recebe o telefone no lugar de `{{nome_contato}}` e `{{primeiro_nome}}`; na campanha, sai em branco. A campanha continua sem `{{primeiro_nome}}`. | invalidada | Todas as variáveis, novas ou antigas, têm texto reserva obrigatório; nenhuma sai sem reserva (CA-B38-48, CA-B38-60). A campanha continua sem `{{primeiro_nome}}`. Marcelle, 26/10/2026. |
| SUP-B38-18 | Automação ou campanha não enviada salva antes desta mudança, com variável sem reserva, fica marcada "precisa de ajuste" e não envia até o texto ganhar o reserva (CA-B38-61). | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-01 | Que tipos de campo a empresa pode criar? | respondida | Texto, Texto longo, Número, Dinheiro, Data, Lista de opções, Múltipla escolha, Sim/não, Link, E-mail e Telefone (os quatro primeiros pedidos mais os comuns em HubSpot, Pipedrive e Kommo). Marcelle, 26/10/2026. |
| PER-B38-02 | Quem cria, edita e apaga os campos? | respondida | Admin e Gerente. Marcelle, 26/10/2026. |
| PER-B38-03 | Além do perfil e do filtro, onde os campos aparecem? | respondida | Painel do contato no Chat, cadastro de novo contato, automações e variáveis na mensagem. Marcelle, 26/10/2026. |
| PER-B38-04 | Campo pode ser obrigatório? | respondida | Não, todos são opcionais. Marcelle, 26/10/2026. |
| PER-B38-05 | O que acontece ao apagar um campo com valores ou em uso? | respondida | Bloqueia enquanto estiver em uso (automação ou filtro salvo); fora de uso, apaga depois de avisar quantos valores se perdem. Marcelle, 26/10/2026. |
| PER-B38-06 | O tipo pode mudar depois de criado? | respondida | Não. Marcelle, 26/10/2026. |
| PER-B38-07 | Em que ordem os campos aparecem? | respondida | Na ordem que a empresa escolhe em Configurações. Marcelle, 26/10/2026. |
| PER-B38-08 | O atendente pode preencher os campos? | respondida | Sim, nos contatos que ele atende; os dados fixos continuam só com Admin e Gerente. Marcelle, 26/10/2026. |
| PER-B38-09 | Os campos viram colunas da lista de Contatos? Quem escolhe quais? | respondida | Sim, todos, por padrão. Cada usuário escolhe quais colunas vê, pelo botão Colunas, e pode esconder qualquer uma menos o Nome (CA-B38-47, CA-B38-65, CA-B38-66). Marcelle, 26/10/2026, depois do teste CA-B38-59; antes era "a empresa marca 'Mostrar na lista de Contatos' e todos veem as mesmas colunas". |
| PER-B38-10 | Importar e exportar contatos entram nesta série? | respondida | Entram, mas como série separada, logo depois desta, porque hoje não existe importar nem exportar contatos. Marcelle, 26/10/2026. |
| PER-B38-11 | O que os campos fazem nos Relatórios e no Dashboard? | respondida | Filtro por campo, tabela de vendas por valor do campo e colunas nos Excel que listam clientes ou vendas. Marcelle, 26/10/2026. |
| PER-B38-12 | Tirar opção de lista em uso: bloqueia ou desliga a automação? | respondida | Bloqueia e mostra onde é usada. Marcelle, 26/10/2026. |
| PER-B38-13 | Mudança de campo personalizado feita por automação dispara outras automações? (Desde a B11, automação não dispara automação.) | respondida | Sim, só para campos personalizados; é uma exceção à regra da B11 (CA-B38-37). Marcelle, 26/10/2026. |
| PER-B38-15 | O texto reserva obrigatório vale também para as mensagens rápidas e para o texto do lembrete da Agenda? | respondida | Sim, em tudo: mensagem das automações, campanhas, mensagens rápidas e lembrete (CA-B38-63, CA-B38-64). Marcelle, 26/10/2026. |
| PER-B38-14 | Como evitar laço infinito entre automações que mudam campos personalizados? | respondida | Numa mesma sequência de mudanças, cada automação roda no máximo uma vez; não há limite de quantas automações em cadeia (CA-B38-62). Marcelle, 26/10/2026. |
