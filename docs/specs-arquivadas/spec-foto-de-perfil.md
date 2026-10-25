# Spec: Foto de perfil real do contato

> série: B29
> estado: concluída em 25/10/2026

## Visão Geral

Hoje o CRM não busca foto de ninguém: o contato aparece com as iniciais do nome ou, sem
nome, com um ícone de pessoa. Esta mudança traz a foto de perfil do WhatsApp do contato
para o CRM, buscada pelo **canal direto** (o número da empresa conectado por QR Code), e a
mostra no chat e no perfil do contato.

É para o atendente reconhecer de cara com quem está falando, como já faz no celular.

Limites que vêm do WhatsApp, não do CRM:

- A API Oficial da Meta não fornece a foto de ninguém. Só o canal direto consegue.
- Quem configurou a privacidade para mostrar a foto só aos próprios contatos continua sem
  foto no CRM, porque o número da empresa não está na agenda dele.
- O endereço da foto que o WhatsApp devolve vence em pouco tempo. Por isso o CRM guarda
  uma **cópia** da imagem, como já faz com os anexos do chat.

Decisões da Marcelle em 20/10/2026 (ver Perguntas em aberto): a foto aparece no chat
(lista e ficha) e no perfil do contato; qualquer número do canal direto conectado na
empresa serve para buscar a foto de qualquer contato, inclusive de quem escreveu pela
Meta; a busca acontece uma vez só, quando o contato nasce.

## Páginas / Módulos

### Gateway — foto de um número

**Descrição:** o gateway passa a responder, para uma instância conectada, qual é a foto
de perfil de um telefone. Ele mesmo baixa a imagem do WhatsApp e entrega os bytes, para
que o CRM não dependa do endereço temporário.

**Componentes:**
- Consulta de foto: dado um telefone, devolve a imagem (tamanho pequeno, o que o
  WhatsApp chama de prévia) ou "sem foto".

**Comportamentos:**
- O CRM, com a credencial da instância, pede a foto de um telefone.
- A instância precisa estar conectada; a consulta não conta como envio (o freio e o ritmo
  não se aplicam, como na consulta "este número existe?").
- Telefone sem foto visível (escondida por privacidade, ou sem foto) responde "sem foto",
  sem erro.
- Telefone inválido é recusado, como nas outras rotas.

**Critérios de aceite:**

#### CA-B29-01 — O gateway entrega a foto de um número · prova: automática

- **Dado** uma instância conectada e um telefone cujo WhatsApp devolve o endereço de uma foto
- **Quando** o CRM pede a foto desse telefone
- **Então** o gateway responde com a própria imagem (tipo de conteúdo de imagem) e não com
  o endereço temporário do WhatsApp

#### CA-B29-02 — Número sem foto visível responde "sem foto" · prova: automática

- **Dado** uma instância conectada e um telefone cujo WhatsApp não devolve foto (escondida
  ou inexistente)
- **Quando** o CRM pede a foto desse telefone
- **Então** o gateway responde "sem foto" (resposta vazia com código próprio), sem erro, e
  não grava nada

#### CA-B29-03 — Sem credencial ou instância desconectada, a consulta é recusada · prova: automática

- **Dado** um pedido de foto sem a credencial da instância, ou para uma instância que não
  está conectada
- **Quando** o pedido chega
- **Então** o gateway recusa (como recusa as demais rotas da instância) e não consulta o
  WhatsApp

#### CA-B29-04 — A consulta não passa pelo freio nem pelo ritmo · prova: automática

- **Dado** uma instância conectada com o freio acionado ou o ritmo esgotado
- **Quando** o CRM pede a foto de um telefone
- **Então** a resposta vem normalmente, e nenhum envio é contado

### CRM — busca e guarda da foto

**Descrição:** quando um contato nasce, o CRM pede a foto dele a um número do canal direto
da empresa, guarda uma cópia no próprio storage e anota no contato onde está a cópia.

**Componentes:**
- Cópia da foto: imagem guardada pelo CRM, por contato, no mesmo lugar e com a mesma
  privacidade dos anexos do chat (só quem está logado na empresa vê).
- Marca no contato: o contato sabe se tem foto guardada e quando foi buscada.

**Comportamentos:**
- Contato que nasce por mensagem recebida (canal direto ou Meta), por lead novo no funil,
  por novo contato na tela de Contatos ou por pedido na loja: o CRM tenta
  buscar a foto logo depois de criá-lo.
- Para buscar, o CRM usa um número do canal direto **conectado** da empresa. Se o contato
  escreveu por um número do canal direto, usa esse; senão, qualquer um conectado.
- Empresa sem número do canal direto conectado: não busca, e o contato fica sem foto.
- A busca é uma vez só por contato: achou foto, guarda e não busca de novo; o WhatsApp
  disse "sem foto", anota e não busca de novo. Só falha técnica (gateway fora do ar ou
  demorando) ganha outra chance: na próxima mensagem desse contato o CRM tenta de novo.
- A busca nunca atrasa nem derruba o que a disparou: mensagem recebida, lead e pedido
  continuam funcionando como hoje mesmo se o gateway falhar ou demorar.
- Contato restaurado da lixeira volta com a foto que tinha.
- Contato apagado de vez tem a cópia da foto apagada junto.

**Critérios de aceite:**

#### CA-B29-05 — Mensagem recebida pelo canal direto traz a foto do contato novo · prova: automática

- **Dado** uma empresa com um número do canal direto conectado e um telefone desconhecido
  cujo WhatsApp tem foto visível
- **Quando** chega a primeira mensagem desse telefone por esse número
- **Então** o contato nasce, a cópia da foto fica guardada no storage do CRM e o contato
  aponta para ela

#### CA-B29-06 — Contato que chega pela Meta ganha a foto pelo canal direto · prova: automática

- **Dado** uma empresa com um número da API Oficial e outro do canal direto, ambos
  conectados, e um telefone desconhecido com foto visível
- **Quando** chega a primeira mensagem desse telefone pelo número da Meta
- **Então** o contato nasce com a foto buscada pelo número do canal direto

#### CA-B29-07 — Lead, contato novo e pedido da loja também buscam · prova: automática

- **Dado** uma empresa com um número do canal direto conectado
- **Quando** um contato nasce por lead novo no funil, por "Novo contato" em Contatos, por
  pedido na loja
- **Então** o CRM pede a foto desse contato ao gateway uma vez, do mesmo jeito que faz para
  a mensagem recebida

#### CA-B29-08 — Sem foto visível, o contato fica com as iniciais e não busca de novo · prova: automática

- **Dado** um telefone cujo WhatsApp não mostra foto
- **Quando** o contato nasce e, depois, escreve de novo
- **Então** o contato fica sem foto (iniciais ou ícone), a tentativa fica anotada, e a
  segunda mensagem não gera nova consulta ao gateway

#### CA-B29-09 — Empresa sem canal direto não busca nada · prova: automática

- **Dado** uma empresa só com número da API Oficial, ou sem número conectado
- **Quando** um contato nasce
- **Então** o CRM não chama o gateway, e o contato fica sem foto

#### CA-B29-10 — Gateway fora do ar não atrapalha a mensagem · prova: automática

- **Dado** uma empresa com canal direto e o gateway respondendo erro ou demorando além do
  limite na consulta de foto
- **Quando** chega a mensagem de um telefone desconhecido
- **Então** o contato nasce, a mensagem é gravada e aparece no chat como hoje; a foto fica
  faltando, e na próxima mensagem desse contato o CRM tenta buscar de novo

#### CA-B29-11 — Lixeira: restaurar devolve a foto; apagar de vez apaga a cópia · prova: automática

- **Dado** um contato com foto guardada
- **Quando** ele é excluído e restaurado
- **Então** volta com a mesma foto
- **E quando** ele é apagado de vez
- **Então** a cópia da foto some do storage

#### CA-B29-12 — Foto só para quem é da empresa · prova: automática

- **Dado** a cópia da foto de um contato de uma empresa
- **Quando** alguém sem login, ou logado em outra empresa, tenta abrir o endereço da foto
- **Então** não consegue (mesma regra dos anexos do chat)

### Chat — lista de conversas e ficha do contato

**Descrição:** onde hoje aparecem as iniciais ou o ícone de pessoa, aparece a foto quando
o contato tem uma.

**Componentes:**
- Círculo do contato: mostra a foto; sem foto, as iniciais; sem nome, o ícone de pessoa
  (como hoje).

**Comportamentos:**
- Lista de conversas: cada conversa mostra a foto do contato no círculo.
- Ficha do contato no chat: o círculo grande mostra a foto.
- Conversa de contato cuja foto chegou enquanto o chat estava aberto: a foto aparece sem
  recarregar, no mesmo caminho em tempo real pelo qual a conversa nova aparece.
- Foto que não carrega (arquivo sumiu, rede): o círculo volta às iniciais, sem quadrado
  quebrado.

**Critérios de aceite:**

#### CA-B29-13 — A lista de conversas mostra a foto · prova: automática

- **Dado** um contato com foto guardada e uma conversa dele
- **Quando** a lista de conversas é exibida
- **Então** o círculo da conversa mostra a imagem, com o nome do contato como texto
  alternativo

#### CA-B29-14 — A ficha do contato mostra a foto · prova: automática

- **Dado** um contato com foto guardada
- **Quando** a ficha dele é aberta no chat
- **Então** o círculo grande mostra a imagem

#### CA-B29-15 — Sem foto, tudo continua como hoje · prova: automática

- **Dado** um contato sem foto guardada
- **Quando** a lista ou a ficha é exibida
- **Então** aparecem as iniciais do nome ou, sem nome, o ícone de pessoa

#### CA-B29-16 — Foto que não carrega volta às iniciais · prova: automática

- **Dado** um contato cuja foto guardada não abre
- **Quando** a lista é exibida
- **Então** o círculo mostra as iniciais, sem imagem quebrada

#### CA-B29-17 — Foto chega ao vivo com a conversa nova · prova: automática

- **Dado** o chat aberto
- **Quando** chega a primeira mensagem de um contato novo com foto
- **Então** a conversa nova aparece na lista já com a foto, sem recarregar a página

#### CA-B29-18 — Chip real: a foto de um contato de verdade aparece no chat · prova: manual

- **Dado** a mudança no ar e a Marcelle com um número do canal direto conectado
- **Quando** um telefone que ela ainda não tem no CRM, com foto visível a todos, manda a
  primeira mensagem
- **Então** a conversa aparece na lista com a foto da pessoa, e a ficha mostra a mesma foto

### Perfil do contato (`/contatos/[id]`)

**Descrição:** o topo do perfil, que hoje não tem círculo, passa a mostrar a foto do
contato, com a mesma regra de iniciais e ícone quando não há foto.

**Componentes:**
- Círculo grande no cabeçalho do perfil, ao lado do nome.

**Comportamentos:**
- Perfil de contato com foto mostra a imagem.
- Perfil de contato sem foto mostra as iniciais ou o ícone.

**Critérios de aceite:**

#### CA-B29-19 — O perfil mostra a foto ou as iniciais · prova: automática

- **Dado** um contato com foto guardada e outro sem
- **Quando** o perfil de cada um é aberto
- **Então** o primeiro mostra a imagem no cabeçalho e o segundo mostra as iniciais ou o
  ícone de pessoa

## Fora de escopo

- Foto pela API Oficial da Meta: a Meta não fornece.
- Atualizar a foto depois da primeira busca (automático ou botão). Decisão da Marcelle
  em 20/10: só na primeira vez. Pode virar série própria.
- Foto nos lugares que ela não pediu: lista de Contatos, cabeçalho da conversa aberta,
  cards do funil, agenda.
- Importação de contatos por planilha: não existe no CRM (só produtos). Tirada do
  CA-B29-07 em 20/10, no /plan da B29-02, com a Marcelle.
- Buscar foto dos contatos que já existem no banco antes desta mudança (ver pergunta
  PER-B29-04).
- Foto de grupos (o CRM não tem grupos).
- Foto dos usuários do CRM (atendentes).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B29-01 | "Só na primeira vez" vale também quando a primeira busca falha por culpa do gateway (fora do ar, demorou): o CRM anota a tentativa e não tenta de novo, mesmo que o contato escreva depois | invalidada | Marcelle, 20/10/2026: falha técnica tenta de novo na próxima mensagem do contato; "sem foto visível" é definitivo. Comportamento e CA-B29-10 ajustados. |
| SUP-B29-02 | O tamanho guardado é o pequeno (a "prévia" do WhatsApp, cerca de 100 px), suficiente para os círculos do chat e do perfil, e barato de guardar | confirmada | Marcelle, 20/10/2026. |
| SUP-B29-03 | A cópia fica no mesmo storage privado dos anexos do chat, servida por endereço assinado, como os anexos | invalidada | O storage dos anexos é público por endereço (B19-05 só tirou a listagem). Marcelle, 20/10/2026, no /plan da B29-02: a foto vai para um bucket próprio e privado, servida por endereço assinado de 1 h. |
| SUP-B29-04 | Quando o contato escreveu por um número do canal direto, a busca usa esse número; nos demais casos, qualquer número do canal direto conectado da empresa, sem preferência | confirmada | Marcelle, 20/10/2026. |
| SUP-B29-05 | A busca da foto acontece depois de a mensagem/lead/pedido estar gravado, com limite de tempo curto, para nunca atrasar o que o atendente vê | confirmada | Marcelle, 20/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B29-01 | Onde a foto aparece? | respondida | Marcelle, 20/10/2026: no chat (lista e ficha) e no perfil do contato. Não na lista de Contatos nem no cabeçalho da conversa. |
| PER-B29-02 | Contato que chega pela Meta pode ter a foto buscada por um número do canal direto da mesma empresa? | respondida | Marcelle, 20/10/2026: sim, qualquer número do canal direto conectado serve. |
| PER-B29-03 | Com que frequência atualizar a foto? | respondida | Marcelle, 20/10/2026: só na primeira vez, quando o contato nasce. |
| PER-B29-04 | Os contatos que já existem no banco quando a mudança subir devem ganhar foto (uma varredura única, respeitando o ritmo do gateway) ou só os que nascerem depois? | respondida | Marcelle, 20/10/2026: só os que nascerem depois; o banco vai ser limpo. |
