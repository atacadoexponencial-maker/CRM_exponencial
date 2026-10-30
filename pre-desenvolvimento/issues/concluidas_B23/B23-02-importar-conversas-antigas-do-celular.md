# B23-02: Importar as conversas antigas do celular para o chat

**Tipo:** Implementação
**Página:** Configurações > WhatsApp (cartão do número) e Chat
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-coexistencia.md`

## Descrição

Logo após registrar uma conexão de número em uso no celular, o CRM pede à Meta, uma única vez, as conversas antigas e a agenda. As partes do histórico chegam pelo webhook fora de ordem e podem repetir; o CRM as grava sem duplicar, cria só os contatos que têm conversa (com o nome da agenda quando houver, sem renomear contato que já existia), ignora grupos, mostra marcador no lugar de mídia não entregue e acompanha o andamento no cartão do número ("Trazendo conversas antigas (N%)", "Conversas antigas importadas", "Você não autorizou o envio das conversas antigas", "Não foi possível trazer as conversas antigas").

## Pronto quando

Depois de conectar, o cartão do número mostra o andamento da importação até "importadas" e as conversas antigas aparecem no chat, em ordem de data, com os contatos certos. Se o dono do número recusar no celular, o cartão diz isso e o número segue conectado.

## Critérios de aceite

- **CA-B23-06** (automática) — A importação começa sozinha logo após a conexão. Dado uma conexão de número em uso no celular recém-registrada, quando o registro termina, então o CRM pede as conversas antigas e a agenda uma única vez, sem ação do Admin, e o cartão do número passa a mostrar "Trazendo conversas antigas".
- **CA-B23-07** (automática) — As conversas antigas aparecem no chat na ordem certa. Dado partes do histórico entregues fora de ordem, quando todas forem processadas, então cada conversa mostra as mensagens em ordem de data, as recebidas do lado do contato e as enviadas do lado da empresa.
- **CA-B23-08** (automática) — A mesma parte entregue duas vezes não duplica mensagem. Dado uma parte do histórico já processada, quando a Meta entrega a mesma parte de novo, então o chat continua com uma única cópia de cada mensagem.
- **CA-B23-09** (automática) — O andamento chega a "importadas". Dado uma importação em andamento, quando a Meta avisa que a entrega chegou a 100%, então o cartão do número mostra "Conversas antigas importadas".
- **CA-B23-10** (automática) — Recusa do dono do número não quebra a conexão. Dado que o dono do número recusou o compartilhamento no aplicativo, quando a Meta avisa da recusa, então o cartão mostra "Você não autorizou o envio das conversas antigas", o número continua conectado e mensagens novas entram normalmente.
- **CA-B23-11** (automática) — Mídia antiga não entregue vira marcador. Dado uma mensagem antiga de foto, áudio ou arquivo que veio sem o conteúdo, quando ela é exibida no chat, então aparece o marcador "Mídia não disponível (mensagem antiga)" no lugar, com a data e o remetente corretos.
- **CA-B23-12** (automática) — Conversa de grupo não entra. Dado um histórico entregue pela Meta, quando ele é processado, então nenhuma conversa de grupo é criada no CRM.
- **CA-B23-13** (automática) — Só vira contato quem tem conversa. Dado uma agenda do celular com contatos com e sem conversa, quando a importação termina, então existem no CRM apenas os contatos que aparecem em alguma conversa importada, e cada um leva o nome salvo na agenda do celular quando houver.
- **CA-B23-14** (automática) — Contato que já existia no CRM não é duplicado nem renomeado. Dado um contato já cadastrado no CRM com o mesmo telefone de uma conversa antiga, quando a conversa é importada, então as mensagens entram no contato existente e o nome dele no CRM não muda.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B23-04 | Conversa antiga importada fica sem atendente responsável e segue a mesma regra de visibilidade de uma conversa nova sem responsável. | confirmada | Marcelle, 10/10/2026. |
| SUP-B23-06 | Quando o contato já existe no CRM, o nome do CRM vale mais que o nome da agenda do celular. | confirmada | Marcelle, 10/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-01 | O CRM importa as conversas antigas do celular? | respondida | Sim, tudo o que a Meta entregar (até 180 dias). Marcelle, 10/10/2026. |
| PER-B23-02 | O que fazer com a agenda de contatos do celular? | respondida | Só vira contato quem tem conversa; usa o nome da agenda quando houver. Marcelle, 10/10/2026. |
