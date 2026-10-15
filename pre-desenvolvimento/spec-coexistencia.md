# Spec: Coexistência (WhatsApp Business no celular e CRM no mesmo número)

> série: B23
> estado: rascunho

## Visão Geral

Hoje, para usar a API Oficial da Meta no CRM, a empresa precisa de um número que **não**
esteja em uso no aplicativo WhatsApp Business. Quem já vende pelo celular tem de trocar de
número ou abandonar o aplicativo.

Esta mudança permite conectar ao CRM um número que **já está em uso no WhatsApp Business
do celular**, sem tirá-lo de lá. O vendedor continua respondendo pelo celular quando
quiser, e o CRM mostra tudo: o que chega, o que sai pelo CRM e o que sai pelo celular.
Na conexão, o CRM traz as conversas antigas do celular para o chat.

É para a empresa atacadista que já tem número conhecido pelos clientes e não quer trocá-lo.

Fonte das regras da Meta citadas aqui: documentação oficial "Onboarding WhatsApp Business
app users" (lida em 10/10/2026).

## Páginas / Módulos

### Conexão do número (`/configuracoes/whatsapp`)

**Descrição:** o Admin conecta pela API Oficial um número que já usa no WhatsApp Business
do celular. A escolha entre "número novo" e "número que já uso no celular" acontece dentro
da janela da própria Meta; o CRM prepara o Admin antes e registra o resultado depois.

**Componentes:**
- Aviso antes de conectar: explica o que muda no celular ao conectar um número em uso
  (aparelhos conectados, como o WhatsApp Web, são desconectados e precisam ser conectados
  de novo; mensagens temporárias, visualização única e listas de transmissão deixam de
  funcionar; grupos continuam só no celular; é preciso abrir o aplicativo no celular ao
  menos a cada 14 dias; mensagem enviada pelo celular continua gratuita e a enviada pelo
  CRM é cobrada pela Meta).
- Opção "Criar cards no Funil de Entrada para os contatos das conversas antigas":
  desmarcada por padrão, escolhida pelo Admin antes de conectar.
- Cartão do número conectado: mostra que o número está em uso também no celular.

**Comportamentos:**
- Ler o aviso do que muda no celular antes de abrir a janela da Meta.
- Marcar ou desmarcar a opção de criar cards para os contatos das conversas antigas.
- Conectar um número que já está em uso no WhatsApp Business do celular.
- Ver, no cartão do número, que ele funciona no celular e no CRM ao mesmo tempo.
- Tentar conectar um número que já está no canal direto do CRM.
- Tentar conectar sendo Gerente ou Atendente.

**Critérios de aceite:**

#### CA-B23-01 — O aviso do que muda no celular aparece antes de conectar · prova: automática

- **Dado** um Admin na tela de WhatsApp, sem número conectado pela API Oficial
- **Quando** ele inicia a conexão
- **Então** a tela mostra o aviso com os cinco pontos (aparelhos conectados, recursos
  desativados, grupos, abrir o aplicativo a cada 14 dias, cobrança das mensagens enviadas
  pelo CRM) antes de abrir a janela da Meta

#### CA-B23-02 — Número em uso no celular fica conectado e identificado · prova: automática

- **Dado** que a Meta devolveu a conclusão de uma conexão de número em uso no celular
- **Quando** o CRM registra a conexão
- **Então** o número aparece na lista como conectado, com a indicação "Em uso também no
  celular", e a opção de criar cards escolhida pelo Admin fica gravada

#### CA-B23-03 — Conexão com chip real funciona de ponta a ponta · prova: manual

- **Dado** um número em uso no WhatsApp Business de um celular
- **Quando** o Admin conclui a conexão pela janela da Meta
- **Então** o número aparece conectado no CRM, o aplicativo do celular continua
  funcionando e uma mensagem recebida aparece nos dois lugares

#### CA-B23-04 — Número que já está no canal direto é recusado · prova: automática

- **Dado** um número já conectado pelo canal direto, em qualquer empresa
- **Quando** a Meta devolve a conclusão da conexão desse mesmo número
- **Então** o CRM não registra a conexão e mostra a mensagem de que o número precisa ser
  desconectado do canal direto antes

#### CA-B23-05 — Só Admin conecta · prova: automática

- **Dado** um Gerente ou Atendente
- **Quando** ele tenta registrar uma conexão de número em uso no celular
- **Então** o CRM recusa e nenhuma conexão é criada

### Conversas antigas do celular

**Descrição:** logo após a conexão, o CRM pede à Meta as conversas antigas do celular e as
coloca no chat. A Meta entrega até 180 dias de conversas individuais, em partes e fora de
ordem; fotos, áudios e arquivos só dos últimos 14 dias. O dono do número pode recusar o
compartilhamento no aplicativo. O pedido só pode ser feito uma vez e tem de acontecer em
até 24 horas depois da conexão.

**Componentes:**
- Situação da importação, no cartão do número: "Trazendo conversas antigas (N%)",
  "Conversas antigas importadas", "Você não autorizou o envio das conversas antigas" ou
  "Não foi possível trazer as conversas antigas".
- Mensagens antigas no chat, na ordem em que aconteceram.
- Marcador de mídia indisponível, no lugar da foto, do áudio ou do arquivo que a Meta não
  entregou.

**Comportamentos:**
- Acompanhar o andamento da importação no cartão do número.
- Ver as conversas antigas no chat, em ordem de data.
- Ver, no lugar de uma mídia antiga não entregue, o marcador de mídia indisponível.
- Recusar o compartilhamento no aplicativo do celular e continuar usando o CRM normalmente.
- Ver o contato criado com o nome salvo na agenda do celular.

**Critérios de aceite:**

#### CA-B23-06 — A importação começa sozinha logo após a conexão · prova: automática

- **Dado** uma conexão de número em uso no celular recém-registrada
- **Quando** o registro termina
- **Então** o CRM pede as conversas antigas e a agenda uma única vez, sem ação do Admin, e
  o cartão do número passa a mostrar "Trazendo conversas antigas"

#### CA-B23-07 — As conversas antigas aparecem no chat na ordem certa · prova: automática

- **Dado** partes do histórico entregues fora de ordem
- **Quando** todas forem processadas
- **Então** cada conversa mostra as mensagens em ordem de data, as recebidas do lado do
  contato e as enviadas do lado da empresa

#### CA-B23-08 — A mesma parte entregue duas vezes não duplica mensagem · prova: automática

- **Dado** uma parte do histórico já processada
- **Quando** a Meta entrega a mesma parte de novo
- **Então** o chat continua com uma única cópia de cada mensagem

#### CA-B23-09 — O andamento chega a "importadas" · prova: automática

- **Dado** uma importação em andamento
- **Quando** a Meta avisa que a entrega chegou a 100%
- **Então** o cartão do número mostra "Conversas antigas importadas"

#### CA-B23-10 — Recusa do dono do número não quebra a conexão · prova: automática

- **Dado** que o dono do número recusou o compartilhamento no aplicativo
- **Quando** a Meta avisa da recusa
- **Então** o cartão mostra "Você não autorizou o envio das conversas antigas", o número
  continua conectado e mensagens novas entram normalmente

#### CA-B23-11 — Mídia antiga não entregue vira marcador · prova: automática

- **Dado** uma mensagem antiga de foto, áudio ou arquivo que veio sem o conteúdo
- **Quando** ela é exibida no chat
- **Então** aparece o marcador "Mídia não disponível (mensagem antiga)" no lugar, com a
  data e o remetente corretos

#### CA-B23-12 — Conversa de grupo não entra · prova: automática

- **Dado** um histórico entregue pela Meta
- **Quando** ele é processado
- **Então** nenhuma conversa de grupo é criada no CRM

#### CA-B23-13 — Só vira contato quem tem conversa · prova: automática

- **Dado** uma agenda do celular com contatos com e sem conversa
- **Quando** a importação termina
- **Então** existem no CRM apenas os contatos que aparecem em alguma conversa importada, e
  cada um leva o nome salvo na agenda do celular quando houver

#### CA-B23-14 — Contato que já existia no CRM não é duplicado nem renomeado · prova: automática

- **Dado** um contato já cadastrado no CRM com o mesmo telefone de uma conversa antiga
- **Quando** a conversa é importada
- **Então** as mensagens entram no contato existente e o nome dele no CRM não muda

#### CA-B23-15 — Conversa antiga não dispara nada · prova: automática

- **Dado** uma importação de conversas antigas
- **Quando** as mensagens entram no chat
- **Então** nenhuma automação roda, nenhuma sequência começa ou para, nenhum alerta é
  criado, nenhuma conversa fica marcada como não lida e os números do dashboard não mudam

#### CA-B23-16 — Sem a opção marcada, conversa antiga não cria card · prova: automática

- **Dado** uma conexão feita com a opção de criar cards desmarcada
- **Quando** a importação termina
- **Então** nenhum card novo existe no Funil de Entrada por causa da importação

#### CA-B23-17 — Com a opção marcada, cada contato importado ganha um card · prova: automática

- **Dado** uma conexão feita com a opção de criar cards marcada
- **Quando** a importação termina
- **Então** cada contato importado que ainda não tinha card ganha um card na primeira
  etapa do Funil de Entrada, e quem já tinha card continua com o mesmo, na mesma etapa

#### CA-B23-18 — Conversa antiga não libera resposta livre · prova: automática

- **Dado** um contato cuja última mensagem recebida veio só pelo histórico importado
- **Quando** o atendente abre a conversa no CRM
- **Então** o CRM exige mensagem de modelo (template) para escrever, como em conversa com
  a janela de 24 horas fechada

### Mensagens enviadas pelo celular

**Descrição:** depois da conexão, tudo o que o vendedor envia pelo aplicativo do celular
(ou por um aparelho conectado a ele) aparece na conversa do CRM. Essas mensagens valem
como resposta do time.

**Componentes:**
- Mensagem de saída com a marca "Enviada pelo celular", no lugar do nome do atendente.

**Comportamentos:**
- Enviar pelo celular e ver a mensagem na conversa do CRM, sem recarregar a tela.
- Enviar pelo celular para um número que ainda não é contato do CRM.
- Enviar pelo CRM e ver a mensagem no aplicativo do celular.
- Ver a edição de uma mensagem feita pelo contato.
- Ver que o contato apagou uma mensagem.

**Critérios de aceite:**

#### CA-B23-19 — Mensagem enviada pelo celular aparece no chat do CRM · prova: automática

- **Dado** um número conectado em uso também no celular
- **Quando** a Meta avisa de uma mensagem enviada pelo aplicativo
- **Então** ela aparece na conversa do contato como enviada pela empresa, com a marca
  "Enviada pelo celular" e sem atendente

#### CA-B23-20 — O envio pelo celular aparece em tempo real, com chip real · prova: manual

- **Dado** a conversa aberta no CRM
- **Quando** o vendedor envia texto, foto e áudio pelo celular
- **Então** os três aparecem no CRM em poucos segundos, sem recarregar a tela, e uma
  mensagem enviada pelo CRM aparece no aplicativo do celular

#### CA-B23-21 — Envio pelo celular a número desconhecido cria o contato · prova: automática

- **Dado** um telefone que não é contato do CRM
- **Quando** chega o aviso de mensagem enviada pelo celular para ele
- **Então** o CRM cria o contato e a conversa, com a mensagem dentro

#### CA-B23-22 — Envio pelo celular vale como resposta do time · prova: automática

- **Dado** uma conversa aguardando resposta, com sequência que para quando o time responde
- **Quando** chega o aviso de mensagem enviada pelo celular
- **Então** a conversa deixa de aguardar resposta, o tempo de resposta do dashboard é
  calculado até essa mensagem e a sequência se comporta como se a resposta tivesse saído
  pelo CRM

#### CA-B23-23 — Envio pelo celular não libera resposta livre · prova: automática

- **Dado** um contato com a janela de 24 horas fechada
- **Quando** o vendedor envia mensagem a ele pelo celular
- **Então** o CRM continua exigindo mensagem de modelo para escrever por ele

#### CA-B23-24 — Mensagem editada pelo contato aparece editada · prova: automática

- **Dado** uma mensagem recebida já exibida no chat
- **Quando** a Meta avisa que o contato a editou
- **Então** o chat mostra o texto novo com a marca "editada"

#### CA-B23-25 — Mensagem apagada pelo contato aparece como apagada · prova: automática

- **Dado** uma mensagem recebida já exibida no chat
- **Quando** a Meta avisa que o contato a apagou
- **Então** o chat mostra "Mensagem apagada" no lugar do conteúdo

### Desconexão

**Descrição:** o número pode sair da API Oficial por decisão tomada no celular (o dono
desconecta em Configurações > Conta > Plataforma Comercial) ou sozinho, quando o
aplicativo fica cerca de 14 dias sem ser aberto. A Meta não deixa o CRM desligar, do lado
dele, um número que está em uso no celular.

**Componentes:**
- Estado "Desconectado" no cartão do número, com o motivo em linguagem simples
  ("Desconectado pelo celular", "Desconectado por falta de uso do aplicativo",
  "O número mudou de aparelho ou de número").
- Alerta na central de alertas.
- Instrução de como desconectar pelo celular, exibida quando o Admin remove o número no CRM.

**Comportamentos:**
- Ver o número como desconectado, com o motivo, quando a desconexão vem do celular.
- Receber um alerta da desconexão.
- Tentar enviar mensagem por um número desconectado.
- Conectar de novo o mesmo número.
- Remover o número no CRM.

**Critérios de aceite:**

#### CA-B23-26 — Desconexão vinda do celular aparece no CRM com o motivo · prova: automática

- **Dado** um número conectado em uso também no celular
- **Quando** a Meta avisa que ele foi desconectado, com o motivo
- **Então** o cartão do número mostra "Desconectado" e o motivo em linguagem simples, e a
  central de alertas ganha um alerta visível para Admin e Gerente

#### CA-B23-27 — Envio por número desconectado é recusado com explicação · prova: automática

- **Dado** um número desconectado
- **Quando** alguém tenta enviar mensagem, campanha, sequência ou automação por ele
- **Então** o envio não sai e o CRM mostra que o número está desconectado e precisa ser
  conectado de novo

#### CA-B23-28 — Reconectar mantém as conversas e não repete as antigas · prova: automática

- **Dado** um número desconectado, com conversas no CRM
- **Quando** o Admin o conecta de novo
- **Então** as conversas e os contatos continuam os mesmos, o número volta a "Conectado" e
  nenhuma mensagem já existente aparece em dobro

#### CA-B23-29 — Desconectar pelo celular reflete no CRM, com chip real · prova: manual

- **Dado** um número conectado em uso também no celular
- **Quando** o dono desconecta pelo aplicativo
- **Então** em poucos minutos o CRM mostra o número como desconectado pelo celular

#### CA-B23-30 — Remover no CRM orienta a desconectar no celular · prova: automática

- **Dado** um número em uso também no celular
- **Quando** o Admin pede para removê-lo no CRM
- **Então** a confirmação explica que é preciso desconectar também no aplicativo
  (Configurações > Conta > Plataforma Comercial) e, ao confirmar, o número sai da lista do
  CRM sem apagar conversas nem contatos

## Fora de escopo

- Conectar o mesmo número ao canal direto e à API Oficial ao mesmo tempo (descartado em
  10/09/2026, `pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`).
- Grupos, chamadas, status, listas de transmissão, catálogo e etiquetas do aplicativo do
  celular: a Meta não os entrega pela API.
- Trazer para o CRM as mensagens rápidas, a saudação e a mensagem de ausência
  configuradas no aplicativo.
- Importar a agenda inteira do celular.
- Editar ou apagar, pelo CRM, mensagem já enviada.
- Lembrete automático para abrir o aplicativo antes dos 14 dias.
- Mudar um número já conectado pela API Oficial "pura" para o modo em uso no celular sem
  conectar de novo.
- Cobrança: continua como hoje, o cliente cadastra o cartão na própria conta do WhatsApp.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-01 | A configuração atual do Cadastro Incorporado do app "Atacado Exp" já oferece, na janela da Meta, a opção de conectar um número em uso no celular, sem nova aprovação. | aberta | — |
| SUP-B23-02 | A opção de criar cards para os contatos das conversas antigas vem **desmarcada** por padrão. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-03 | A opção de criar cards é escolhida uma vez, antes de conectar, e não pode ser mudada depois. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-04 | Conversa antiga importada fica sem atendente responsável e segue a mesma regra de visibilidade de uma conversa nova sem responsável. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-05 | Mensagens antigas importadas não entram em nenhum número do dashboard, nem os de períodos passados. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-06 | Quando o contato já existe no CRM, o nome do CRM vale mais que o nome da agenda do celular. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-07 | O ritmo atual de envio de campanhas fica abaixo do teto de 20 mensagens por segundo que a Meta impõe a número em uso no celular. | aberta | — |
| SUP-B23-08 | Remover o número no CRM continua só tirando-o do CRM; desligar de verdade é feito pelo dono, no celular. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-09 | Edição e exclusão de mensagem pelo contato valem só para números em uso no celular; os outros números continuam como hoje. | confirmada | Marcelle, 10/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-01 | O CRM importa as conversas antigas do celular? | respondida | Sim, tudo o que a Meta entregar (até 180 dias). Marcelle, 10/10/2026. |
| PER-B23-02 | O que fazer com a agenda de contatos do celular? | respondida | Só vira contato quem tem conversa; usa o nome da agenda quando houver. Marcelle, 10/10/2026. |
| PER-B23-03 | Mensagem enviada pelo celular vale como resposta do time? | respondida | Sim: vale para sequências, automações e métricas, marcada como "Enviada pelo celular". Marcelle, 10/10/2026. |
| PER-B23-04 | Contato vindo só das conversas antigas ganha card no Funil de Entrada? | respondida | É escolha do cliente na conexão. Marcelle, 10/10/2026. |
| PER-B23-05 | Qual número com WhatsApp Business no celular será usado nos três testes com chip real (conexão, envio pelo celular, desconexão)? | aberta | Marcelle ainda não tem o número (10/10/2026). Só trava os três testes com chip real. |
