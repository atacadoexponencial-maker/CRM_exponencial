# B25-02: Mensagem enviada pelo celular aparece na conversa do CRM

**Tipo:** Implementação
**Página:** Chat (`/chat`) — conversa e caixa de entrada; webhook do gateway
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-canal-direto-envio-pelo-celular.md`

## Descrição

O CRM recebe o evento de mensagem enviada pelo celular (B25-01) e põe a mensagem na
conversa do contato, do lado da empresa, com a marca "Enviada pelo celular" no lugar do
nome do atendente. A mensagem aparece em tempo real, atualiza a prévia na caixa de
entrada, cria contato e conversa quando o número é novo, reabre conversa resolvida, mostra
a citação e não soma "não lidas". Aviso repetido não duplica a mensagem.

## Pronto quando

Com o chat aberto, o vendedor manda pelo celular um texto, uma foto e um áudio, e os três
aparecem no CRM em poucos segundos, marcados "Enviada pelo celular". A resposta pelo CRM
aparece uma vez só, sem a marca.

## Critérios de aceite

- **CA-B25-05** (automática) — Aviso repetido não vira mensagem repetida. Dado um aviso de mensagem enviada pelo celular já entregue ao CRM, quando o gateway entrega o mesmo aviso de novo (reentrega), então o CRM mostra a mensagem uma vez só.
- **CA-B25-06** (automática) — Mensagem enviada pelo celular aparece na conversa. Dado um contato com conversa aberta no CRM, quando chega o aviso de mensagem enviada pelo celular para ele, então a mensagem entra na conversa como enviada pela empresa, com a marca "Enviada pelo celular" e sem atendente, e a prévia da conversa passa a ser ela.
- **CA-B25-07** (automática) — A mensagem aparece em tempo real. Dado a conversa aberta na tela do CRM, quando chega o aviso de mensagem enviada pelo celular para aquele contato, então a mensagem aparece na tela sem recarregar, pelo mesmo caminho das mensagens recebidas.
- **CA-B25-08** (automática) — Envio pelo celular a número desconhecido cria contato e conversa. Dado um telefone que não é contato do CRM, quando chega o aviso de mensagem enviada pelo celular para ele, então o CRM cria o contato e a conversa, com a mensagem dentro, e não cria card em funil nenhum.
- **CA-B25-09** (automática) — Resposta pelo celular reabre a conversa resolvida. Dado um contato cuja conversa está resolvida, quando chega o aviso de mensagem enviada pelo celular para ele, então a conversa volta a ficar aberta, em atendimento, com a mensagem dentro.
- **CA-B25-10** (automática) — Mensagem citada aparece como citação. Dado uma mensagem do contato já exibida na conversa, quando o vendedor responde a ela pelo celular, citando-a, então a mensagem enviada pelo celular aparece no CRM com a citação da original.
- **CA-B25-11** (automática) — Enviar pelo celular não soma "não lidas". Dado uma conversa com mensagens não lidas, quando chega o aviso de mensagem enviada pelo celular, então o número de não lidas da conversa não aumenta.
- **CA-B25-14** (manual) — Conversa completa no CRM, com chip real. Dado um número conectado pelo canal direto e a conversa aberta no CRM, quando o vendedor envia pelo celular um texto, uma foto e um áudio, e depois responde pelo CRM, então os três envios do celular aparecem no CRM em poucos segundos, marcados "Enviada pelo celular". A resposta pelo CRM aparece uma vez só, sem a marca, e também aparece no celular.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B25-02 | Hoje, quando o atendente escreve pelo CRM numa conversa resolvida, ela volta a ficar em atendimento. A resposta pelo celular segue a mesma regra. | confirmada | Marcelle, 15/10/2026. Conferir no código no /plan. |
| SUP-B25-05 | O contato criado por envio pelo celular nasce sem nome. Nesse caso o WhatsApp não manda o nome do destinatário, e o nome entra quando ele responder (correção de 15/10/2026). | confirmada | Marcelle, 15/10/2026. |
| SUP-B25-06 | Conversa nova aberta por envio pelo celular não dispara a automação "conversa criada". Ela pode criar card, e o CA-B25-08 diz que não nasce card; a regra de resposta do time é da B25-03. | confirmada | Marcelle, 19/10/2026. |
| SUP-B25-07 | Conversa resolvida reaberta pelo celular volta para "em atendimento" quando tem responsável e para "em espera" quando não tem, a mesma regra do botão "Reabrir". | confirmada | Marcelle, 19/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B25-02 | Envio pelo celular a número que não é contato do CRM: cria ou ignora? | respondida | Cria o contato e a conversa, sem card. Marcelle, 15/10/2026. |
| PER-B25-03 | Resposta pelo celular em conversa resolvida: reabre ou fica resolvida? | respondida | Reabre, em atendimento. Marcelle, 15/10/2026. |

> **Achado do /plan (19/10/2026), sobre a SUP-B25-02:** a premissa não vale no código. Hoje,
> enviar pelo CRM numa conversa resolvida **não** muda o status: `enviarMensagemSemMotivo`, em
> `src/app/(auth)/chat/actions.ts`, só grava a mensagem e a prévia, e quem reabre é o botão
> "Reabrir" (`reabrirConversa`). A decisão da PER-B25-03 continua valendo e é o que esta issue
> implementa: a resposta pelo celular reabre a conversa. O envio pelo CRM fica como está.

## Cenários

### Happy Path
1. O gateway entrega `message.sent_from_phone` (contrato 3.5) em `/api/webhooks/gateway`. A
   assinatura e a idempotência por `event_id` são as mesmas dos outros eventos.
2. A rota confere o `data` (`message_id`, `to` e `type`) e chama `registrarEnviadaPeloCelular`.
3. O contato é achado pelo `to` (com `lid:` na frente quando `to_is_lid`), pela mesma busca do
   recebimento. Contato na lixeira sai dela, como no recebimento.
4. A mídia, quando há, é baixada para o Storage do CRM pelo mesmo `guardarMidiaRecebida`.
5. A conversa é escolhida: primeiro a aberta do mesmo número; se não houver, a resolvida mais
   recente do mesmo número, que é reaberta; se também não houver, uma conversa nova.
6. A mensagem é gravada com `direction: "enviada"`, `status: "enviado"`, `sent_from_phone: true`,
   o `wamid`, a citação e o horário do aviso. A conversa ganha a prévia e o horário, e o número
   de não lidas fica como estava.
7. A mensagem é transmitida pelo mesmo `transmitirMensagem` das recebidas, levando
   `sent_from_phone`. Na tela aberta, sem recarregar, o balão aparece do lado da empresa com
   "Enviada pelo celular".

### Edge Cases
- **Reentrega do mesmo aviso:** a rota ignora o `event_id` já processado. Se a tentativa
  anterior morreu no meio, o `insert` repetido esbarra no `wamid` único e não duplica.
- **Número desconhecido:** cria o contato sem nome (SUP-B25-05) e a conversa `em_espera`, sem
  responsável e com 0 não lidas. Não cria card e não dispara automação (SUP-B25-06).
- **Conversa resolvida:** volta para `em_atendimento` se tem responsável e para `em_espera`
  se não tem, a mesma regra do botão "Reabrir" (SUP-B25-07).
- **Citação de mensagem que o CRM não tem:** grava só a prévia que veio no aviso, como no
  recebimento.
- **Destinatário em LID:** cai no contato `lid:<id>`, como a mensagem recebida.
- **Download da mídia falhou:** a mensagem é gravada com a legenda ou com "Arquivo não
  recebido", como no recebimento.

### Cenário de Erro
- `data` sem `message_id`, `to` ou `type`: a rota responde 400, como no `message.received`
  inválido.
- O banco falha ao criar o contato ou a conversa: a função lança, a rota responde 500 e o
  evento fica sem `processed_at`. A reentrega processa de novo.
- A transmissão em tempo real falha: a mensagem aparece no próximo carregamento, porque o
  `transmitirMensagem` nunca derruba quem o chama.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B25-05 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` e `src/test/gateway-webhook.test.ts` | Com o `insert` recusado pelo `wamid` único, a segunda gravação do mesmo aviso não transmite nem cria outra mensagem; na rota, o aviso repetido já processado é ignorado sem chamar o registro |
| CA-B25-06 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` e `src/test/balao-enviada-pelo-celular.test.tsx` | A mensagem é gravada como `enviada`, com `sent_from_phone: true`, e a conversa recebe a prévia; o balão mostra "Enviada pelo celular" do lado da empresa, e a mensagem enviada pelo CRM não mostra |
| CA-B25-07 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | `transmitirMensagem`, o caminho das recebidas, é chamado com a mensagem, `direction: "enviada"` e `sent_from_phone: true` |
| CA-B25-08 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | Telefone desconhecido cria o contato sem nome e a conversa com a mensagem dentro, sem escrita em cards e sem automação disparada |
| CA-B25-09 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | Contato só com conversa resolvida e com responsável: a conversa volta a `em_atendimento` e a mensagem entra nela, sem abrir outra |
| CA-B25-10 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | Aviso com `reply_to` de mensagem que o CRM tem grava o `reply_to_id` dela e a prévia citada |
| CA-B25-11 | automática | `src/test/gateway-enviada-pelo-celular.test.ts` | Conversa com 3 não lidas continua com 3 depois do aviso |
| CA-B25-14 | manual | roteiro abaixo | Os três envios pelo celular aparecem com a marca, e a resposta pelo CRM aparece uma vez só |

### Roteiro manual — CA-B25-14
Só depois que esta issue estiver no ar e a B25-01 estiver na VPS (merge do gateway).
1. Abra o chat do CRM na conversa de um contato do número conectado pelo canal direto.
2. Pelo celular desse número, envie ao contato um texto, uma foto e um áudio.
3. Em poucos segundos, sem recarregar a página, os três devem aparecer no CRM do lado da
   empresa, cada um com "Enviada pelo celular".
4. Responda pelo CRM. A resposta deve aparecer uma vez só, sem a marca, e também no celular.

## Banco de Dados

- Tabela: `messages`
  - `sent_from_phone` (boolean, not null, default false): marca a mensagem que saiu do número
    conectado por outro aparelho (celular ou WhatsApp Web), e não pelo CRM.
- Migration: `supabase/migrations/20261019000001_mensagem_enviada_pelo_celular.sql`, aplicada
  com `npx supabase db push --linked`. Depois, `src/integrations/supabase/types.ts` é
  regenerado com `supabase gen types typescript --linked`.

## Arquivos

- **Criar:** `supabase/migrations/20261019000001_mensagem_enviada_pelo_celular.sql`: a coluna `messages.sent_from_phone`
- **Criar:** `src/lib/whatsapp/enviada-pelo-celular.ts`: o tipo do evento (`EventoMensagemEnviadaPeloCelular`) e `registrarEnviadaPeloCelular`, que cuida do contato, da mídia, da escolha ou reabertura da conversa, da gravação e da transmissão
- **Modificar:** `src/lib/whatsapp/recebimento.ts`: exporta `acharOuCriarContato` e `acharMensagemPorWamid`, para reaproveitar sem duplicar
- **Modificar:** `src/lib/whatsapp/realtime.ts`: `sent_from_phone` opcional em `MensagemTransmitida`
- **Modificar:** `src/app/api/webhooks/gateway/route.ts`: `message.sent_from_phone` entra nos tipos conhecidos; a rota valida o `data` e chama `registrarEnviadaPeloCelular`
- **Modificar:** `src/integrations/supabase/types.ts`: regenerado, não editado à mão
- **Modificar:** `src/app/(auth)/chat/mock-mensagens.ts`: `enviadaPeloCelular?: boolean` em `Mensagem`
- **Modificar:** `src/app/(auth)/chat/actions.ts`: `buscarMensagens` lê `sent_from_phone`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx`: a mensagem em tempo real leva `sent_from_phone`
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx`: a marca "Enviada pelo celular" no balão de saída
- **Criar:** `src/test/gateway-enviada-pelo-celular.test.ts`: os testes de CA-B25-05 a CA-B25-11 no registro
- **Criar:** `src/test/balao-enviada-pelo-celular.test.tsx`: o teste da marca no balão (CA-B25-06)
- **Modificar:** `src/test/gateway-webhook.test.ts`: a rota aceita o evento novo e ignora a reentrega (CA-B25-05)

## Checklist

- [x] Migration da coluna `messages.sent_from_phone` criada e aplicada com `db push`; tipos regenerados
- [x] `acharOuCriarContato` e `acharMensagemPorWamid` exportados de `recebimento.ts`
- [x] `registrarEnviadaPeloCelular` em `src/lib/whatsapp/enviada-pelo-celular.ts`, na ordem aberta → resolvida (reabre) → nova, sem somar não lidas e sem disparar automação
- [x] `MensagemTransmitida` com `sent_from_phone`
- [x] Rota do webhook aceita `message.sent_from_phone`, valida o `data` e despacha
- [x] `Mensagem.enviadaPeloCelular` lida em `buscarMensagens` e no tempo real do `chat-layout`
- [x] Balão de saída com "Enviada pelo celular"
- [x] Testes da tabela Prova escritos e passando
- [x] Build verde

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B25-14 | Marcelle | 20/10/2026 |
