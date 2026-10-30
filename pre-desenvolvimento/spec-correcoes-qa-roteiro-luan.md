# Spec: Correções do roteiro de QA do Luan (Partes A e B)

> série: B53
> estado: aprovada em 30/10/2026

## Visão Geral

O Luan rodou o roteiro de QA das Partes A (empresa nova com chip) e B ("[TESTE] Automações
B11" com o número da API Oficial) em 26 e 27/10/2026. A maior parte passou; esta série corrige
o que falhou e **ainda falha no código de hoje** (master 2c80b46, conferido em 30/10/2026).

Itens do relatório que já foram resolvidos por séries posteriores ao teste e por isso **não
entram**: conversa nova sem card de Lead (B45-01), horário 3h adiantado no histórico do card e
na timeline (B48-14), duração estimada de 11h34 por erro de fuso (B48-14), a palavra
"workspace" na tela (B46-13) e o áudio como endereço cru no Dashboard (B46-05). O Luan
reconfere esses itens no reteste da série.

Para quem: todas as empresas, em especial as que usam a API Oficial (mídia, imagem por
automação, leitura nas campanhas, templates), e as atendentes no dia a dia (agenda, rodízio).

## Páginas / Módulos

### Automações — enviar arquivo

**Descrição:** a ação "Enviar arquivo" manda imagem ou documento ao contato.

**Componentes:**
- Ação "Enviar arquivo" do editor de automações.

**Comportamentos:**
- Automação com imagem, num número da API Oficial: a imagem chega ao contato.
- Automação com documento: o documento chega com o nome do arquivo, como hoje.

**Critérios de aceite:**

#### CA-B53-01 — Imagem da automação sai sem nome de arquivo · prova: automática

- **Dado** uma automação com a ação "Enviar arquivo" com uma imagem
- **Quando** ela roda para um contato num número da API Oficial
- **Então** o pedido à Meta leva a imagem sem o nome do arquivo (a Meta recusa `filename` em `image`), e um documento continua levando o nome

#### CA-B53-02 — Imagem da automação chega no celular pela API Oficial · prova: manual

- **Dado** a automação do roteiro B5.3 no número +55 11 95504-6911
- **Quando** o gatilho dispara
- **Então** a imagem chega no celular do contato e o Histórico mostra a execução concluída

### Automações — atribuir ao time

**Descrição:** a ação "Atribuir ao time" passa a conversa para alguém do time escolhido.

**Componentes:**
- Ação "Atribuir ao time".
- Histórico das automações (motivo da falha).

**Comportamentos:**
- A ação escolhe só entre os **Atendentes** ativos do time, o de menos conversas abertas.
- Gerente e Admin cadastrados no time nunca são escolhidos.
- Time sem nenhum Atendente ativo: a ação falha e o Histórico diz o motivo.
- O card e o dono do contato acompanham a pessoa escolhida, inclusive quando a conversa já estava com um Atendente do time e fica com ele.

**Critérios de aceite:**

#### CA-B53-03 — Rodízio só entre Atendentes · prova: automática

- **Dado** um time com um Gerente sem conversas e um Atendente com 3 conversas abertas
- **Quando** a ação "Atribuir ao time" roda para uma conversa sem dono
- **Então** a conversa vai para o Atendente

#### CA-B53-04 — Time sem Atendente falha com motivo · prova: automática

- **Dado** um time só com Gerente e Admin
- **Quando** a ação "Atribuir ao time" roda
- **Então** a conversa não muda de dono e o Histórico mostra a ação com falha e o motivo "O time não tem atendente ativo"

#### CA-B53-05 — Card e contato acompanham a conversa · prova: automática

- **Dado** uma conversa já com um Atendente do time, e o card e o contato com o Gerente
- **Quando** a ação "Atribuir ao time" roda
- **Então** a conversa fica com o Atendente e o card e o dono do contato passam para ele

### Automações — histórico

**Descrição:** o Histórico mostra o resultado de cada execução.

**Comportamentos:**
- Execução que para numa condição falsa sem nada ligado na saída "não" aparece como "Ignorada", com o motivo, e não como "Concluída —".

**Critérios de aceite:**

#### CA-B53-06 — Condição não atendida aparece como Ignorada · prova: automática

- **Dado** uma automação cuja condição deu "não" e a saída "não" não está ligada a nenhum bloco
- **Quando** a execução termina
- **Então** o Histórico mostra "Ignorada" com o motivo "Condição não atendida: <nome da condição>"

### Automações — esperar por tempo

**Descrição:** o bloco "Esperar" por tempo só segue quando o relógio é chamado, e quem chama é o
gateway (issue B28-05, série A11 do gateway). O gateway no ar em 30/10/2026 não tem o relógio:
o commit da A11-01 não está no repositório do gateway e a variável do relógio não está na VPS.
Nada muda no CRM; esta série acompanha a publicação.

**Comportamentos:**
- Uma espera de 1 minuto segue sozinha, sem ninguém mandar mensagem.

**Critérios de aceite:**

#### CA-B53-07 — "Esperar 1 minuto" segue sozinho · prova: manual

- **Dado** o gateway publicado com o relógio (A11-01) e a variável configurada, e uma regra com "esperar 1 minuto" entre duas mensagens
- **Quando** o gatilho dispara
- **Então** a segunda mensagem sai entre 1 minuto e 1 minuto e 30 segundos depois da primeira e o Histórico deixa de mostrar "Esperando"

### Campanhas — leitura e aviso das 24h

**Descrição:** o relatório da campanha conta enviados, entregues e lidos pelos avisos da Meta.

**Componentes:**
- Relatório de entrega da campanha.
- Editor da campanha (aviso da janela de 24h da Meta).

**Comportamentos:**
- Um aviso atrasado nunca faz o status voltar (lido não volta para entregue; entregue não volta para enviado). Isso vale também para o tique das mensagens no Chat.
- Todos os avisos de um mesmo pacote enviado pela Meta são lidos, não só o primeiro.
- O aviso das 24h aparece só quando o número da campanha é da API Oficial.

**Critérios de aceite:**

#### CA-B53-08 — "Lido" não volta para "Entregue" · prova: automática

- **Dado** um destinatário de campanha já marcado como lido
- **Quando** chega um aviso de "entregue" atrasado
- **Então** o destinatário continua lido, e a mensagem no Chat continua com o tique de lida

#### CA-B53-09 — Todos os avisos do pacote são gravados · prova: automática

- **Dado** um aviso da Meta com dois destinatários em blocos diferentes do mesmo pacote
- **Quando** o CRM recebe o aviso
- **Então** os dois destinatários têm o status atualizado

#### CA-B53-10 — Leitura aparece no relatório da API Oficial · prova: manual

- **Dado** uma campanha enviada pelo número da API Oficial a um celular com confirmação de leitura ligada
- **Quando** a mensagem é aberta no celular
- **Então** em até 1 minuto o relatório mostra "Lido" e Lidos 1

#### CA-B53-11 — Aviso das 24h só na API Oficial · prova: automática

- **Dado** o editor da campanha
- **Quando** o número escolhido é do canal direto
- **Então** o aviso da janela de 24h da Meta não aparece; com número da API Oficial, aparece

### Chat — mídia recebida pela API Oficial

**Descrição:** hoje toda mensagem recebida pela API Oficial é gravada como texto; a mídia nunca
é baixada e vira balão vazio.

**Comportamentos:**
- Imagem, áudio, vídeo, documento e figurinha recebidos pela API Oficial aparecem no Chat como no canal direto, com a legenda quando houver.
- O documento aparece com o nome do arquivo.
- Se a mídia não puder ser baixada, o balão diz que a mídia não pôde ser carregada, em vez de ficar vazio.

**Critérios de aceite:**

#### CA-B53-12 — Mídia da Meta vira mídia no Chat · prova: automática

- **Dado** um aviso de mensagem recebida da Meta com imagem e legenda
- **Quando** o CRM o recebe
- **Então** a mensagem fica gravada como imagem, com o arquivo guardado no armazenamento da empresa e a legenda como texto (o mesmo vale para áudio, vídeo, documento com nome e figurinha)

#### CA-B53-13 — Falha ao baixar não deixa balão vazio · prova: automática

- **Dado** um aviso de mídia cujo download na Meta falha
- **Quando** o CRM o recebe
- **Então** a mensagem é gravada e o balão mostra "Mídia não pôde ser carregada"

#### CA-B53-14 — Mídia recebida aparece no Chat pela API Oficial · prova: manual

- **Dado** o número +55 11 95504-6911
- **Quando** o contato manda imagem, áudio, PDF e vídeo
- **Então** os quatro aparecem no Chat e abrem

### Templates da Meta

**Descrição:** `/configuracoes/templates` lista e cria templates no número da API Oficial.

**Comportamentos:**
- Com chip e API Oficial na mesma empresa, a lista mostra os templates do número da API Oficial.
- Se a Meta recusar a consulta, a tela diz que não conseguiu carregar, em vez de mostrar lista vazia.
- Ao digitar o nome, a tela mostra o nome final que vai para a Meta (ex.: "Teste Luan" → `teste_luan`).
- O servidor faz a mesma conversão e recusa nome que continue inválido.

**Critérios de aceite:**

#### CA-B53-15 — Lista de templates com chip e API Oficial · prova: automática

- **Dado** uma empresa com um número do canal direto e um da API Oficial
- **Quando** o Admin abre a tela de templates
- **Então** a lista vem do número da API Oficial

#### CA-B53-16 — Falha da Meta aparece como erro · prova: automática

- **Dado** a Meta respondendo com erro à consulta de templates
- **Quando** o Admin abre a tela
- **Então** a tela mostra "Não foi possível carregar os templates da Meta" e não uma lista vazia

#### CA-B53-17 — Nome final do template aparece antes de enviar · prova: automática

- **Dado** o formulário de novo template
- **Quando** a pessoa digita "Teste Luan"
- **Então** a tela mostra que o nome enviado será `teste_luan`

#### CA-B53-18 — Servidor confere o nome do template · prova: automática

- **Dado** um pedido de criação com o nome "Promoção-Já"
- **Quando** ele chega ao servidor
- **Então** é recusado com a mensagem do que é aceito, sem chamar a Meta

### Agenda

**Descrição:** follow-ups e lembretes do vendedor.

**Comportamentos:**
- Follow-up para hoje sem horário vai para a próxima hora cheia (14:20 → 15:00; 14:00 → 15:00). Para outros dias, continua 09:00.
- "Adiar 1, 3 ou 7 dias" soma ao horário original do lembrete.
- Se a soma ainda ficar no passado, o lembrete vai para hoje + N dias, no mesmo horário do dia do original.

**Critérios de aceite:**

#### CA-B53-19 — Follow-up de hoje sem horário vai para a próxima hora cheia · prova: automática

- **Dado** agora 14:20 em Brasília
- **Quando** a pessoa agenda um follow-up para hoje sem horário
- **Então** ele é salvo para hoje às 15:00, sem o erro "a data já passou"

#### CA-B53-20 — Adiar soma ao horário original · prova: automática

- **Dado** um lembrete para amanhã às 10:00
- **Quando** a pessoa usa "Adiar 1 dia"
- **Então** ele passa para depois de amanhã às 10:00

#### CA-B53-21 — Adiar lembrete atrasado nunca cai no passado · prova: automática

- **Dado** um lembrete atrasado de 3 dias atrás às 10:00
- **Quando** a pessoa usa "Adiar 1 dia"
- **Então** ele passa para amanhã às 10:00

### Contato — timeline e compras

**Descrição:** o perfil do contato (`/contatos/[id]`).

**Comportamentos:**
- Editar os dados do contato grava um evento "Dados editados" na timeline, com quem editou e os nomes dos campos que mudaram (sem os valores antigos).
- Salvar sem mudar nada não grava evento.
- A compra registrada aparece na lista sem precisar de F5.

**Critérios de aceite:**

#### CA-B53-22 — Edição aparece na timeline · prova: automática

- **Dado** um contato com cidade "Santos"
- **Quando** a Marcelle muda a cidade e o tipo e salva
- **Então** a timeline mostra "Dados editados" por Marcelle, com "Cidade, Tipo"

#### CA-B53-23 — Salvar sem mudança não grava evento · prova: automática

- **Dado** um contato
- **Quando** a pessoa salva sem alterar nada
- **Então** nenhum evento "Dados editados" é gravado

#### CA-B53-24 — Compra nova aparece sem F5 · prova: manual

- **Dado** o perfil do contato aberto
- **Quando** uma compra é registrada pelo caminho que o Luan usou no roteiro A6.4 (ver PER-B53-01)
- **Então** a compra aparece na lista do perfil sem recarregar a página

### Loja — grade e repetir pedido

**Descrição:** a loja pública do catálogo (`/loja/[endereco]`).

**Comportamentos:**
- Grade fechada cobra o preço do pacote: R$ 140 por grade sai R$ 140 no pedido, não a soma dos preços por peça arredondados.
- A loja lembra, naquele navegador, o nome e o WhatsApp do último pedido e os preenche ao repetir o pedido; a cliente pode apagar e digitar outros.

**Critérios de aceite:**

#### CA-B53-25 — Grade de R$ 140 é cobrada R$ 140 · prova: automática

- **Dado** uma grade fechada de 6 peças por R$ 140
- **Quando** a cliente pede 1 e 2 grades
- **Então** o total do pedido gravado é R$ 140,00 e R$ 280,00, na loja e no pedido do CRM

#### CA-B53-26 — Repetir pedido mantém nome e WhatsApp · prova: automática

- **Dado** uma cliente que fez um pedido com nome e WhatsApp naquele navegador
- **Quando** ela volta à loja e usa "Repetir pedido"
- **Então** o carrinho é refeito e o nome e o WhatsApp vêm preenchidos

### Relatórios — Carteiras

**Descrição:** a aba Carteiras.

**Comportamentos:**
- O atendente não vê o selo com a quantidade de vendedores; vê só o total da carteira dele.
- "Remover da carteira" não fica disponível para quem tem 0 contatos.
- Depois de remover, o diálogo fecha e o total atualiza.

**Critérios de aceite:**

#### CA-B53-27 — Atendente vê só o total da carteira · prova: automática

- **Dado** um atendente com 2 contatos na carteira
- **Quando** ele abre a aba Carteiras
- **Então** vê "2 na carteira" e nenhum selo "Minha carteira 1"

#### CA-B53-28 — Remover só com contatos na carteira · prova: automática

- **Dado** um vendedor com 0 contatos na carteira
- **Quando** o Admin vê a linha dele
- **Então** "Remover da carteira" não está disponível

#### CA-B53-29 — Remover fecha o diálogo · prova: automática

- **Dado** um vendedor com 3 contatos
- **Quando** o Admin confirma "Remover da carteira"
- **Então** o diálogo fecha e a linha mostra 0

### Avatar

**Descrição:** as iniciais nos avatares de contato, de usuário e de time.

**Comportamentos:**
- As iniciais ignoram símbolos e usam letras e números: "[TESTE] Automações B11" → "TB".
- Contato, usuário e time usam a mesma regra.

**Critérios de aceite:**

#### CA-B53-30 — Iniciais ignoram símbolos · prova: automática

- **Dado** os nomes "[TESTE] Automações B11", "Loja Beta" e "(11) 99999-0000"
- **Quando** o avatar é montado
- **Então** as iniciais são "TB", "LB" e "19"

## Fora de escopo

- Classificação do contato e Carteiras ("Inativo" ou "Sem histórico" para quem o RFV chama de "Campeão"): vai para série própria, porque a regra também alimenta a segmentação das campanhas e as automações (Marcelle, 30/10/2026).
- Tela de Saúde para o número da API Oficial: é funcionalidade nova (Marcelle, 30/10/2026).
- Legenda visível no balão do Chat (a legenda da mídia recebida fica gravada, mas o balão não a mostra em nenhum dos dois canais) (Marcelle, 30/10/2026).
- Editar o telefone do contato (Marcelle, 30/10/2026).
- Cartão ou mapa para localização recebida (hoje é texto com link, nos dois canais).
- Gatilho e limite de "card parado N dias"; desconto em R$; ritmo do chip 08–20h; confirmação ao pausar ou ativar automação; apagar campanha enviada ou template rejeitado; prévia da imagem na campanha; horário exato da regra RFV.
- A duração estimada da campanha continuar contando a espera até a janela abrir (está certo).
- Publicar a A11-01 no gateway: é do repositório do gateway; aqui só se confere o resultado (CA-B53-07).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-01 | Na ordem dos status, só se avança (enviado → entregue → lido); "falhou" pode chegar depois de "enviado", mas nunca depois de "entregue" ou "lido". | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |
| SUP-B53-02 | O card e o dono do contato acompanham a pessoa escolhida por "Atribuir ao time" (hoje só acompanham quando a conversa muda de dono). | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |
| SUP-B53-03 | Follow-up de hoje sem horário depois das 23h vai para 23:59 de hoje. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |
| SUP-B53-04 | Os campos que contam como "Dados editados" são os do formulário de edição do contato (nome, tipo, cidade, UF, ICP, observações e campos personalizados); etiquetas e dono do contato já têm registro próprio ou ficam fora. O telefone não entra: não é editável em nenhuma tela. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026; telefone tirado (não é editável) com o ok dela no mesmo dia. |
| SUP-B53-05 | A loja guarda nome e WhatsApp só no navegador da cliente, nunca no servidor além do pedido que já grava. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |
| SUP-B53-06 | O bloco de condição não tem nome; o "<nome da condição>" do motivo (CA-B53-06) é o rótulo da primeira verificação que não valeu, como no editor (ex.: "Condição não atendida: Tag do contato"). E a execução só vira "Ignorada" quando nenhuma ação rodou no caminho: a que já fez alguma ação antes da condição continua "Concluída" (ou "Falhou"), porque a proteção de repetição não conta as ignoradas e a regra mandaria a mesma ação de novo. | confirmada | Marcelle confirmou, 30/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B53-01 | Por onde o Luan registrou a compra que só apareceu com F5 (botão do perfil, pedido do catálogo fechado ou Chat)? O código do botão do perfil já recarrega a lista. | respondida | Marcelle, 30/10/2026: refez no ar e a compra apareceu sem F5, pelo botão do perfil e pelo pedido do catálogo; não se reproduz mais. |
| PER-B53-02 | O "Remover da carteira" que ficou aberto mostrando 0 era a segunda abertura do diálogo, já com 0 contatos? O código atual fecha o diálogo depois de remover. | respondida | Marcelle, 30/10/2026: refez no ar; o diálogo fecha e a linha vai para 0, e com 0 contatos o "Remover" fica desabilitado. |
| PER-B53-03 | Quando o Luan publica a A11-01 (relógio das automações) no gateway? O commit 2a71e2d não está no repositório do gateway, e a VPS não tem nem o código nem a variável (conferido em 30/10/2026). | aberta | — |
