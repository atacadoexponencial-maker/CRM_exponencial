# Spec: Templates da Meta — prévia, edição e campanha por template

> série: B54
> estado: aprovada em 30/10/2026 (apagar template incluído no mesmo dia)

## Visão Geral

Template é a mensagem pré-aprovada pela Meta que a API Oficial exige para falar com
quem não respondeu nas últimas 24 horas. Ele só existe nos números da API Oficial; o
canal direto (chip conectado por QR Code) manda qualquer texto e não tem template.

Hoje a tela de templates só lista e cria (nome, categoria, idioma e corpo). Não dá para
ver o conteúdo de um template já criado nem para corrigi-lo. E a campanha só dispara
texto livre, imagem ou documento, o que, pela API Oficial, falha para a lista fria.

Esta mudança, para Admin e Gerente da empresa:

1. Na tela de templates, mostra o conteúdo de cada template como ele aparece no
   WhatsApp e deixa editar o que a Meta permite editar.
2. Na campanha, traz a escolha do número para a etapa da mensagem e, quando o número é
   da API Oficial, oferece o tipo de mensagem **Template**: escolher um aprovado,
   dizer de onde vem cada variável, anexar o arquivo do cabeçalho quando o template
   tem um, e disparar pela Meta com o resultado no relatório.

A escolha do número em si já existe (B7-03); aqui ela só muda de etapa.

## Páginas / Módulos

### Tela de templates (`/configuracoes/templates`)

**Descrição:** lista os templates do número da API Oficial da empresa, cria novos e,
nesta mudança, mostra a prévia e edita os existentes. Passa a abrir também para o Gerente, que até
aqui não a via; o Atendente continua sem acesso.

**Componentes:**
- Lista de templates: nome, categoria, idioma, status (Aprovado, Pendente, Rejeitado,
  Pausado) e, por linha, os botões **Ver**, **Apagar** e, quando a Meta permite, **Editar**.
- Painel de prévia: o template desenhado como um balão do WhatsApp, com cabeçalho
  (texto ou a marca do tipo de mídia), corpo, rodapé e botões.
- Formulário de template (criação e edição): nome, categoria, idioma, cabeçalho
  (nenhum, texto, imagem, vídeo ou documento), corpo, rodapé e até três botões
  (resposta rápida, abrir link ou ligar). Com cabeçalho de mídia, pede um arquivo de
  exemplo para a análise da Meta.

**Comportamentos:**
- Ver a prévia de qualquer template da lista.
- Editar um template aprovado, rejeitado ou pausado.
- Ver, no template pendente, que ele não pode ser editado enquanto a Meta analisa.
- Criar um template com cabeçalho, rodapé e botões, não só o corpo.
- Receber em português o aviso dos limites de edição da Meta e o motivo de uma recusa.
- Apagar um template, depois de confirmar, sabendo que o nome fica bloqueado por 30 dias.

**Critérios de aceite:**

#### CA-B54-01 — Ver um template mostra o conteúdo como no WhatsApp · prova: automática

- **Dado** um template na lista com cabeçalho de texto, corpo com `{{1}}`, rodapé e
  dois botões
- **Quando** o Admin clica em **Ver**
- **Então** abre o painel de prévia com o cabeçalho, o corpo com `{{1}}` escrito como
  está, o rodapé e os dois botões com os textos deles (o conteúdo vem da Meta, não do
  que foi digitado na criação)

#### CA-B54-02 — Prévia de template com cabeçalho de mídia · prova: automática

- **Dado** um template cujo cabeçalho é imagem, vídeo ou documento
- **Quando** o Admin clica em **Ver**
- **Então** a prévia mostra, no lugar da mídia, a marca do tipo ("Imagem", "Vídeo" ou
  "Documento") acima do corpo

#### CA-B54-03 — Editar só aparece quando a Meta permite · prova: automática

- **Dado** a lista com um template aprovado, um rejeitado, um pausado e um pendente
- **Quando** a lista é mostrada
- **Então** os três primeiros têm o botão **Editar** e o pendente, no lugar dele, o
  aviso "Em análise pela Meta; só pode ser editado depois da resposta"

#### CA-B54-04 — O formulário de edição abre preenchido e com nome e idioma travados · prova: automática

- **Dado** um template aprovado com cabeçalho de texto, corpo, rodapé e botões
- **Quando** o Admin clica em **Editar**
- **Então** o formulário abre com cada parte preenchida com o que está na Meta, a
  categoria editável, e nome e idioma visíveis mas sem edição, com o aviso "A Meta não
  deixa mudar o nome nem o idioma de um template criado"

#### CA-B54-05 — Salvar a edição devolve o template à análise · prova: automática

- **Dado** o formulário de edição de um template aprovado com o corpo alterado
- **Quando** o Admin salva e a Meta aceita
- **Então** a lista mostra o template como **Pendente** e a tela avisa "Template
  enviado à Meta para nova análise"

#### CA-B54-06 — A Meta recusa a edição · prova: automática

- **Dado** o formulário de edição com uma alteração
- **Quando** o Admin salva e a Meta recusa
- **Então** o formulário continua aberto, com o motivo da Meta em português quando
  conhecido (ou o texto dela quando não), e a lista não muda

#### CA-B54-07 — Criar e editar com cabeçalho de texto, rodapé e botões · prova: automática

- **Dado** o formulário de criação ou edição
- **Quando** o Admin preenche cabeçalho de texto, corpo, rodapé e um botão de cada
  tipo (resposta rápida, abrir link, ligar) e salva
- **Então** a Meta recebe todas essas partes, e a prévia desse template depois mostra
  cada uma

#### CA-B54-08 — Cabeçalho de mídia exige um arquivo de exemplo · prova: automática

- **Dado** o formulário com cabeçalho "Imagem", "Vídeo" ou "Documento"
- **Quando** o Admin salva sem anexar o arquivo de exemplo
- **Então** a tela avisa "Anexe um exemplo do arquivo do cabeçalho para a análise da
  Meta" e não envia; com o arquivo anexado, envia

#### CA-B54-09 — Limite de edições de template aprovado · prova: automática

- **Dado** o formulário de edição de um template aprovado
- **Quando** ele abre
- **Então** mostra o aviso "Template aprovado pode ser editado até 10 vezes em 30
  dias, uma por dia"; e, se a Meta recusar por ter passado do limite, o motivo aparece
  em português ("A Meta não aceitou: limite de edições deste template atingido")

#### CA-B54-10 — Prévia e edição no número real · prova: manual

- **Dado** o número da API Oficial da Marcelle conectado
- **Quando** ela cria um template com cabeçalho e botões, vê a prévia, edita o corpo
  depois de aprovado e salva
- **Então** a prévia bate com o que o Gerenciador da Meta mostra e o template volta a
  Pendente nos dois lugares

#### CA-B54-30 — Apagar um template pede confirmação e avisa do bloqueio do nome · prova: automática

- **Dado** um template na lista, em qualquer status
- **Quando** o Admin clica em **Apagar**
- **Então** abre a confirmação "Apagar o template nome_do_template? A Meta bloqueia esse
  nome por 30 dias e recusa envios novos com ele; campanhas salvas com este template
  deixam de confirmar"; ao confirmar, o template some da lista e a tela avisa "Template
  apagado"; ao cancelar, nada muda

#### CA-B54-31 — A Meta recusa a exclusão · prova: automática

- **Dado** a confirmação de apagar aceita
- **Quando** a Meta recusa
- **Então** o template continua na lista e a tela mostra o motivo em português quando
  conhecido (ou o texto dela quando não)

### Editor de campanha — etapa 2, Mensagem (`/campanhas/[id]`)

**Descrição:** a etapa da mensagem passa a começar pela escolha do número e, quando o
número é da API Oficial, oferece o tipo **Template**. A etapa 3 fica só com o
agendamento e a estimativa. Admin e Gerente, como hoje.

**Componentes:**
- Seletor **Enviar pelo número**: o mesmo que hoje fica na etapa 3, agora como primeiro
  campo da etapa 2.
- Tipos de mensagem: Texto, Imagem + legenda, Documento + legenda e, só com número da
  API Oficial escolhido, **Template**.
- Lista de templates: os aprovados do número escolhido, exceto os de autenticação,
  cada um com nome, categoria e idioma.
- Origem de cada variável: para cada `{{n}}` do corpo (e do botão de link com
  variável, quando houver), um seletor com Nome do contato, Primeiro nome, Nome do
  vendedor, cada campo personalizado da empresa, ou Texto fixo; e o texto reserva.
- Arquivo do cabeçalho: quando o template tem cabeçalho de mídia, o mesmo seletor de
  arquivo que a campanha de imagem e documento já usa.
- Prévia: o template como balão do WhatsApp, com as variáveis trocadas pelo texto fixo
  ou pelo nome da origem entre colchetes (ex.: "Olá [Nome do contato]").

**Comportamentos:**
- Escolher o número no começo da etapa 2.
- Escolher o tipo Template quando o número é da API Oficial.
- Escolher um template aprovado desse número.
- Dizer de onde vem cada variável e o texto reserva.
- Anexar o arquivo do cabeçalho quando o template pede.
- Ver a prévia antes de avançar.
- Salvar e duplicar a campanha com o template e o mapeamento.

**Critérios de aceite:**

#### CA-B54-11 — O número é escolhido na etapa da mensagem · prova: automática

- **Dado** uma empresa com dois números conectados
- **Quando** o Admin abre a etapa 2 de uma campanha
- **Então** "Enviar pelo número" é o primeiro campo dela, a etapa 3 não o tem mais, e
  o número escolhido fica gravado na campanha e vale para a estimativa da etapa 3 (a
  mesma gravação de hoje)

#### CA-B54-12 — Número do canal direto não oferece template · prova: automática

- **Dado** a etapa 2 com um número do canal direto escolhido, ou com "Usar o número
  conectado da empresa"
- **Quando** a tela mostra os tipos de mensagem
- **Então** aparecem só Texto, Imagem + legenda e Documento + legenda, com a nota
  "Template só existe na API Oficial"

#### CA-B54-13 — Número da API Oficial oferece o tipo Template · prova: automática

- **Dado** a etapa 2 com um número da API Oficial escolhido
- **Quando** a tela mostra os tipos de mensagem
- **Então** aparece o quarto tipo, **Template**

#### CA-B54-14 — A lista traz só os aprovados do número escolhido · prova: automática

- **Dado** dois números da API Oficial na empresa, cada um com os seus templates, e no
  escolhido um aprovado, um pendente, um rejeitado e um de autenticação aprovado
- **Quando** o Admin escolhe o tipo Template
- **Então** a lista mostra só o aprovado desse número; nem o pendente, nem o
  rejeitado, nem o de autenticação, nem os do outro número aparecem

#### CA-B54-15 — Trocar o número limpa um template que não existe nele · prova: automática

- **Dado** a etapa 2 com o tipo Template e um template escolhido
- **Quando** o Admin troca para um número que não tem esse template (ou para um do
  canal direto)
- **Então** a escolha do template é apagada, o tipo volta a Texto e a tela avisa "O
  template escolhido não existe neste número"

#### CA-B54-16 — Cada variável tem uma origem · prova: automática

- **Dado** um template escolhido com `{{1}}` e `{{2}}` no corpo e um botão de link com
  `{{1}}`
- **Quando** a tela mostra o template
- **Então** há três seletores de origem, um por variável, cada um com Nome do contato,
  Primeiro nome, Nome do vendedor, os campos personalizados da empresa e Texto fixo; o
  Texto fixo abre um campo para digitar

#### CA-B54-17 — Variável do contato exige texto reserva · prova: automática

- **Dado** uma variável com origem Nome do contato e reserva em branco
- **Quando** o Admin clica em Próximo
- **Então** a tela avisa "Preencha o texto reserva da variável 1" e não avança; com a
  reserva preenchida, avança (variável de Texto fixo não pede reserva)

#### CA-B54-18 — Template com cabeçalho de mídia pede o arquivo · prova: automática

- **Dado** um template escolhido com cabeçalho de imagem
- **Quando** o Admin clica em Próximo sem anexar o arquivo
- **Então** a tela avisa "Anexe a imagem do cabeçalho" e não avança; o arquivo segue
  as mesmas regras de tipo e tamanho dos anexos de campanha de hoje

#### CA-B54-19 — A prévia mostra o template com as origens · prova: automática

- **Dado** o template "Olá {{1}}, seu vendedor é {{2}}" com `{{1}}` vindo de Nome do
  contato e `{{2}}` com Texto fixo "Ana"
- **Quando** a tela mostra a prévia
- **Então** ela mostra "Olá [Nome do contato], seu vendedor é Ana", com cabeçalho,
  rodapé e botões do template

#### CA-B54-20 — Sem aviso das 24 horas no tipo Template · prova: automática

- **Dado** a etapa 2 com número da API Oficial
- **Quando** o tipo é Template
- **Então** o aviso de que a Meta só entrega mensagem livre em 24 horas não aparece;
  ele volta ao trocar para Texto

#### CA-B54-21 — Salvar e duplicar guardam o template e as origens · prova: automática

- **Dado** uma campanha de tipo Template com as origens e o arquivo do cabeçalho
  preenchidos
- **Quando** o Admin salva, reabre, e depois duplica a campanha
- **Então** a reaberta e a cópia mostram o mesmo template, as mesmas origens e o
  mesmo arquivo

#### CA-B54-22 — O Gerente vê e mexe em templates como o Admin · prova: automática

- **Dado** um Gerente logado
- **Quando** ele abre Configurações > Templates e, numa campanha, escolhe o tipo
  Template
- **Então** a tela de templates abre para ele com Ver, Editar e Novo template, e a
  lista de aprovados aparece na campanha como para o Admin; o Atendente continua sem
  acesso à tela de templates

### Envio da campanha e relatório

**Descrição:** o disparo pela Meta passa a saber mandar template, com os parâmetros de
cada destinatário, e o relatório mostra o resultado.

**Componentes:**
- Envio por template: nome, idioma e, por destinatário, o valor de cada variável e o
  arquivo do cabeçalho.
- Relatório da campanha: o cabeçalho diz o template usado; a lista de destinatários e
  os motivos de falha são os de hoje.
- Lista de campanhas: mostra o tipo da mensagem ("Template: nome").

**Comportamentos:**
- Confirmar o envio só se o template continua aprovado.
- Enviar o template para cada destinatário com os valores dele.
- Ver no relatório o template e o motivo de cada falha.

**Critérios de aceite:**

#### CA-B54-23 — Confirmar reconfere que o template está aprovado · prova: automática

- **Dado** uma campanha de tipo Template cujo template foi pausado ou rejeitado depois
  de escolhido
- **Quando** o Admin clica em Enviar agora ou Agendar
- **Então** a campanha não começa e a tela avisa "O template não está mais aprovado na
  Meta. Escolha outro ou corrija-o em Configurações > Templates"

#### CA-B54-24 — Cada destinatário recebe o template com os valores dele · prova: automática

- **Dado** uma campanha de template com `{{1}}` vindo de Nome do contato (reserva
  "cliente"), `{{2}}` de um campo personalizado e `{{3}}` com Texto fixo, e dois
  destinatários, um deles sem nome e sem o campo preenchido
- **Quando** o disparo roda
- **Então** a Meta recebe, para cada um, o template pelo nome e idioma com os três
  valores na ordem; o destinatário sem nome recebe "cliente" e, no campo vazio, a
  reserva dele; o relatório marca os dois como enviados

#### CA-B54-25 — Cabeçalho de mídia vai com o arquivo da campanha · prova: automática

- **Dado** uma campanha de template com cabeçalho de imagem e o arquivo anexado
- **Quando** o disparo roda
- **Então** cada envio leva o arquivo do cabeçalho por um link que vale 1 hora (o
  mesmo prazo dos anexos de campanha de hoje)

#### CA-B54-26 — Recusa da Meta vira falha com motivo · prova: automática

- **Dado** uma campanha de template em que a Meta recusa um destinatário (template
  pausado no meio do envio, ou valor de variável fora do padrão dela)
- **Quando** o disparo roda
- **Então** esse destinatário fica como falhou com o motivo em português no
  relatório, e os demais seguem

#### CA-B54-27 — Número que deixou de ser da API Oficial · prova: automática

- **Dado** uma campanha de template agendada cujo número foi desconectado antes da hora
- **Quando** o disparo roda
- **Então** os destinatários pendentes ficam como falhou com o motivo "O número da
  campanha não está mais conectado", como já acontece hoje com número desconectado

#### CA-B54-28 — Relatório e lista dizem qual template foi usado · prova: automática

- **Dado** uma campanha de template enviada
- **Quando** o Admin abre a lista de campanhas e o relatório dela
- **Então** a lista mostra "Template: nome_do_template" na coluna de mensagem e o
  relatório mostra o nome do template no cabeçalho

#### CA-B54-29 — Disparo real por template · prova: manual

- **Dado** o número da API Oficial da Marcelle e um contato de teste que não falou com
  ele nas últimas 24 horas
- **Quando** ela dispara uma campanha de template com variável do contato e cabeçalho
  de imagem para esse contato
- **Então** a mensagem chega no celular com o nome do contato e a imagem, e o
  relatório marca entregue

## Fora de escopo

- Enviar template avulso pela conversa do Chat ou pelas automações. Isso vem numa
  série depois, reaproveitando o envio desta.
- Registrar a mensagem de campanha na conversa do Chat (as campanhas de hoje também
  não registram).
- Template nos números do canal direto: não existe na Meta, e o canal direto manda
  texto livre.
- Qualidade do template, pausas pela Meta e o motivo delas, além de mostrar o status.
- Templates de autenticação (código de uso único) na campanha.
- Botões de cópia de cupom e catálogo, e cabeçalho de localização.
- Resposta do cliente a botão de resposta rápida: chega no Chat como texto, como hoje.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B54-01 | A criação de template ganha os mesmos campos da edição (cabeçalho, rodapé, botões e arquivo de exemplo); hoje só tem o corpo. Sem isso não haveria como criar o template com cabeçalho que a campanha vai usar. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-02 | Template de autenticação não aparece na campanha: a Meta fixa o conteúdo dele (código de uso único), e não serve para disparo em massa. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-03 | O Gerente vê a lista de templates aprovados dentro da campanha, mas a tela de Configurações > Templates continua só do Admin. | invalidada | Marcelle, 30/10/2026: o Gerente vê tudo, inclusive a tela de templates (CA-B54-22) |
| SUP-B54-04 | Com "Usar o número conectado da empresa" (sem escolher um), o tipo Template não aparece: para template, a campanha precisa de um número da API Oficial escolhido. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-05 | Campanhas em rascunho ou agendadas de antes continuam com o número que já tinham; só o lugar do seletor muda. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-06 | A prévia na tela de templates mostra `{{1}}`, `{{2}}` como estão, sem valores de exemplo; a prévia com origem só existe na campanha. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-07 | A reserva da variável vale para Nome do contato, Primeiro nome, Nome do vendedor e campo personalizado; Texto fixo não tem reserva. | confirmada | Marcelle, 30/10/2026 |
| SUP-B54-08 | Apagar remove o template em todos os idiomas daquele nome, como a Meta faz por padrão; a tela não oferece apagar só um idioma. | confirmada | Marcelle, 30/10/2026 (incluiu apagar no escopo) |
| SUP-B54-09 | Variável no corpo, no cabeçalho de texto ou no link de botão vai à Meta com um exemplo gerado pela tela ("Exemplo 1", "Exemplo 2"…), porque a Meta exige exemplo para analisar e o formulário não pede mais um campo por variável. | invalidada | Marcelle, 30/10/2026: o formulário pede um campo de exemplo por variável (corpo, cabeçalho de texto e link de botão), obrigatório |
| SUP-B54-10 | O arquivo de exemplo do cabeçalho de mídia vai direto do navegador à Meta pelo servidor do CRM, sem ficar guardado, e aceita até 4 MB (limite do servidor); o arquivo real da campanha segue as regras dela. | confirmada | Marcelle, 30/10/2026 |

## Perguntas em aberto

Nenhuma. As quatro decisões (número no começo da etapa 2, templates com cabeçalho de
mídia entram agora, edição de tudo o que a Meta permite, texto reserva obrigatório)
foram tomadas pela Marcelle em 30/10/2026 e estão no texto.
