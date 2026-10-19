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

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B25-02 | Envio pelo celular a número que não é contato do CRM: cria ou ignora? | respondida | Cria o contato e a conversa, sem card. Marcelle, 15/10/2026. |
| PER-B25-03 | Resposta pelo celular em conversa resolvida: reabre ou fica resolvida? | respondida | Reabre, em atendimento. Marcelle, 15/10/2026. |
