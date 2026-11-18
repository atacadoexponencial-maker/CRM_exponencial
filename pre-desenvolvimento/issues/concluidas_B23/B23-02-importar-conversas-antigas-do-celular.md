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
| SUP-B23-13 | Mensagem antiga que a empresa mandou pelo celular entra no chat com a marca "Enviada pelo celular" (como as da B23-04) e com o status que a Meta informa (lida, entregue ou enviada). | confirmada | Marcelle, 30/10/2026. |
| SUP-B23-14 | Conversa criada pela importação nasce "em espera", sem não lidas, e a prévia da lista (`last_message`) só avança: mensagem antiga nunca faz a conversa parecer mais recente do que ela é. | confirmada | Marcelle, 30/10/2026. |
| SUP-B23-15 | Mídia antiga que a Meta entrega depois do marcador substitui o marcador; se chegar antes dele (sem como saber de qual contato é), é ignorada e o marcador fica. | confirmada | Marcelle, 30/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B23-01 | O CRM importa as conversas antigas do celular? | respondida | Sim, tudo o que a Meta entregar (até 180 dias). Marcelle, 10/10/2026. |
| PER-B23-02 | O que fazer com a agenda de contatos do celular? | respondida | Só vira contato quem tem conversa; usa o nome da agenda quando houver. Marcelle, 10/10/2026. |

## Cenários

### Happy Path
1. `completarConexaoWhatsApp` (B23-01) grava a conexão com `em_uso_no_celular = true`. Logo em seguida, no servidor, o CRM manda à Meta dois pedidos `POST /{phone_number_id}/smb_app_data`: `sync_type: "smb_app_state_sync"` (agenda) e `sync_type: "history"` (conversas). Grava na conexão `historico_situacao = "importando"`, `historico_progresso = 0` e `historico_pedido_em = agora`. O pedido só acontece se `historico_pedido_em` estiver vazio (a Meta aceita uma vez só).
2. O cartão do número mostra "Trazendo conversas antigas (0%)".
3. A Meta manda webhooks `field: "smb_app_state_sync"` com a agenda (`state_sync[].contact.{phone_number, full_name}` e `action: "add" | "remove"`). O CRM guarda cada nome na tabela `agenda_do_celular` (por conexão e telefone). Nenhum contato nasce daqui.
4. A Meta manda webhooks `field: "history"`, em partes (`history[].metadata.{phase, chunk_order, progress}`), cada parte com `threads[]` (uma por contato, `id` = telefone do contato) e `messages[]` (`from`, `id`, `timestamp`, `type`, conteúdo, `history_context.status`). Para cada thread com `id` só de dígitos:
   - o contato é o da empresa com esse telefone; se não existe, nasce com o nome da agenda (quando houver), **sem card** (os cards são da B23-03);
   - a conversa é a desse contato e desse número (qualquer status); se não existe, nasce `em_espera`, sem atendente e com `unread_count = 0`; `last_message_at/text` só avançam se a mensagem importada for mais nova que o que a conversa já tem;
   - cada mensagem vira uma linha em `messages` com `created_at` = `timestamp` da Meta, `wamid` = `id`; `from` igual ao número da empresa (`metadata.display_phone_number`, em dígitos) → `direction: "enviada"`, `sent_from_phone: true`, status traduzido de `history_context.status` (READ → lido, DELIVERED → entregue, demais → enviado); senão `direction: "recebida"`;
   - texto, botão, lista, localização e cartão de contato passam por `lerMensagemMeta`; `type: "media_placeholder"` vira `type: "midia_antiga"` com o conteúdo "Mídia não disponível (mensagem antiga)"; mídia com `id` (foto, áudio, vídeo, documento, figurinha) é baixada por `guardarMidiaDaMeta`, e sem sucesso fica o mesmo marcador;
   - a gravação é `upsert` por `wamid` ignorando repetidos: a mesma parte entregue duas vezes não cria nada.
   O progresso gravado é o maior já visto; em 100, `historico_situacao = "importado"`.
5. Mídia antiga que a Meta entrega à parte (webhook `history` com `messages[]`, mesmo `id` de uma mensagem já gravada como marcador) é baixada e substitui o marcador na mensagem (tipo, conteúdo e campos de mídia).
6. O chat mostra as conversas antigas em ordem de `created_at` (a ordenação que já existe), recebidas de um lado e enviadas do outro com "Enviada pelo celular". Nenhuma automação é chamada neste caminho.

### Edge Cases
- Partes fora de ordem (chunk 2 antes do 1): cada mensagem leva a própria data, e o chat ordena por ela; o progresso guarda o maior valor.
- Thread de grupo (id com `@g.us`, hífen ou qualquer coisa além de dígitos): a parte inteira do grupo é ignorada.
- Agenda chega antes do histórico: o nome fica em `agenda_do_celular` e é usado quando a conversa aparecer. Agenda chega depois: contatos da empresa com esse telefone e **sem nome** ganham o nome; contato com nome não muda (SUP-B23-06).
- Contato da agenda sem conversa: nunca vira contato do CRM (CA-B23-13). `action: "remove"` apaga a linha da agenda.
- Mensagem antiga do contato que já existe no CRM: entra na conversa dele, nome intacto (CA-B23-14).
- Mídia à parte chegando **antes** do marcador (sem `to` não há como saber o contato): é ignorada; o marcador que chegar depois fica como marcador.
- Reentrega do webhook da agenda: `upsert` por conexão e telefone.
- Conexão que não está em uso no celular recebe `history`: nada é feito (a Meta não manda, mas o CRM não confia).

### Cenário de Erro
- Webhook `history` com `history[].errors[]` (código 2593109, "History sync is turned off by the business"): `historico_situacao = "recusado"`; a conexão segue `connected` e mensagens novas entram pelo caminho normal. Cartão: "Você não autorizou o envio das conversas antigas".
- O pedido `smb_app_data` falha (resposta não 2xx) ou lança: a conexão fica conectada, `historico_situacao = "falhou"`. Cartão: "Não foi possível trazer as conversas antigas". O erro vai para o log do servidor.
- Falha ao baixar uma mídia: a mensagem fica com o marcador; o resto da parte segue.
- Falha de banco no meio de uma parte: o webhook responde 500 e a Meta reentrega; o `upsert` por `wamid` absorve o que já entrou.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B23-06 | automática | `src/test/historico-do-celular.integration.test.ts` | Ao concluir a conexão em coexistência (Meta como fetch espião), o servidor manda os dois pedidos `smb_app_data` (agenda e histórico) uma vez só, a conexão fica `historico_situacao = "importando"` e o texto do cartão é "Trazendo conversas antigas (0%)"; conectar número comum não pede nada. |
| CA-B23-07 | automática | `src/test/historico-do-celular.integration.test.ts` | Duas partes entregues fora de ordem viram, na conversa do contato, mensagens em ordem de data, as do contato como `recebida` e as da empresa como `enviada` pelo celular. |
| CA-B23-08 | automática | `src/test/historico-do-celular.integration.test.ts` | Reentregar a mesma parte deixa a conversa com a mesma quantidade de mensagens e os mesmos `wamid`. |
| CA-B23-09 | automática | `src/test/historico-do-celular.integration.test.ts` e `src/test/historico-do-celular.test.tsx` | Parte com `progress: 100` deixa a conexão `importado`, e o cartão com esse estado mostra "Conversas antigas importadas". |
| CA-B23-10 | automática | `src/test/historico-do-celular.integration.test.ts` e `src/test/historico-do-celular.test.tsx` | Webhook de recusa deixa a conexão `recusado` e ainda `connected`; uma mensagem nova pelo webhook normal entra; o cartão mostra "Você não autorizou o envio das conversas antigas". |
| CA-B23-11 | automática | `src/test/historico-do-celular.integration.test.ts` | `media_placeholder` vira mensagem `midia_antiga` com "Mídia não disponível (mensagem antiga)", `created_at` da Meta e `direction` do remetente certo. |
| CA-B23-12 | automática | `src/test/historico-do-celular.integration.test.ts` | Parte com thread de grupo não cria contato, conversa nem mensagem para o grupo. |
| CA-B23-13 | automática | `src/test/historico-do-celular.integration.test.ts` | Agenda com dois nomes, só um com conversa: existe um contato só, com o nome da agenda; o outro não existe. |
| CA-B23-14 | automática | `src/test/historico-do-celular.integration.test.ts` | Contato já cadastrado com nome recebe as mensagens antigas na própria conversa e mantém o nome, mesmo com nome diferente na agenda. |

## Banco de Dados

- Tabela: `whatsapp_connections` (migration `supabase/migrations/20261030000031_historico_do_celular.sql`)
  - `historico_situacao` (text, nulo; `importando` | `importado` | `recusado` | `falhou`) — andamento da importação das conversas antigas.
  - `historico_progresso` (integer, not null, default 0) — maior `progress` recebido (0 a 100).
  - `historico_pedido_em` (timestamptz, nulo) — quando o pedido `smb_app_data` foi feito; preenchido, não se pede de novo.
  - `grant select` das três para `authenticated` (L-15).
- Tabela nova: `agenda_do_celular`
  - `id` (uuid), `workspace_id` (uuid → workspaces), `whatsapp_connection_id` (uuid → whatsapp_connections, on delete cascade), `phone_number` (text), `nome` (text), `created_at`; único por (`whatsapp_connection_id`, `phone_number`). RLS ligada, sem política: só o servidor (service role) lê e grava.

## Arquivos

- **Criar:** `supabase/migrations/20261030000031_historico_do_celular.sql` — colunas, grant e tabela acima.
- **Modificar:** `src/integrations/supabase/types.ts` — só as colunas e a tabela novas, na forma do gerador (mesmo motivo da B23-01).
- **Criar:** `src/lib/whatsapp/historico-do-celular.ts` — `pedirHistoricoDoCelular` (os dois `smb_app_data` e a marcação na conexão), `processarHistorico` (partes, threads, mensagens, mídia à parte, recusa, progresso), `processarAgenda` (`smb_app_state_sync`), `textoDaImportacao` (o texto do cartão). Reusa `lerMensagemMeta`/`midiaDaMensagemMeta` de `@/lib/whatsapp/mensagem-meta`, `guardarMidiaDaMeta` de `@/lib/whatsapp/midia-recebida`, `nomeDoPerfil`/`previaDaMensagemGravada` de `@/lib/whatsapp/recebimento`.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — lê o `field` de cada change e manda `history` e `smb_app_state_sync` para a lib antes do caminho de `messages`; a conexão é lida com `phone_number` e `em_uso_no_celular`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `completarConexaoWhatsApp` chama `pedirHistoricoDoCelular` depois de gravar uma conexão em coexistência.
- **Modificar:** `src/lib/whatsapp/gateway/instancias.ts` — `ConexaoListada` ganha `historicoSituacao` e `historicoProgresso`; `listarConexoes` os lê.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — monta o texto da importação com `textoDaImportacao` e passa ao cartão.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — `NumeroConectado.importacao?: string` e a linha com esse texto sob o número.
- **Modificar:** `src/test/gateway-instancias.test.ts` — a forma exata da conexão listada ganha os dois campos novos (L-05).
- **Criar:** `src/test/historico-do-celular.integration.test.ts` — CA-B23-06 a CA-B23-14 contra o banco de teste, webhook assinado como a Meta assina (padrão de `src/test/webhook-whatsapp-status.integration.test.ts`) e action com fetch espião.
- **Criar:** `src/test/historico-do-celular.test.tsx` — parte de tela de CA-B23-09 e CA-B23-10: o cartão com cada situação.

## Dependências Externas

- Meta Graph API `POST /{phone_number_id}/smb_app_data` (`messaging_product: "whatsapp"`, `sync_type`), webhooks `history` e `smb_app_state_sync` (referência de webhooks da Meta, lida em 30/10/2026). Os campos `history`, `smb_app_state_sync`, `smb_message_echoes` e `account_update` precisam estar assinados no painel do app (roteiro da B23-01).

## Checklist

- [x] Migration (colunas, grant, `agenda_do_celular`) aplicada no banco de teste e `types.ts` com as novidades
- [x] `historico-do-celular.ts`: pedido à Meta, marcação na conexão, texto do cartão
- [x] `historico-do-celular.ts`: agenda (`smb_app_state_sync`) guardada e nomes aplicados a contatos sem nome
- [x] `historico-do-celular.ts`: partes do histórico (threads, grupos fora, contato/conversa/mensagens, placeholder, mídia, dedupe, progresso, recusa)
- [x] Webhook despacha `history` e `smb_app_state_sync` para a lib
- [x] `completarConexaoWhatsApp` pede o histórico após gravar conexão em coexistência
- [x] Lista, página e cartão mostram a situação da importação
- [x] `tsc` sem erro (L-07) e testes vizinhos (webhook, cartão, instâncias) passando (L-05)
