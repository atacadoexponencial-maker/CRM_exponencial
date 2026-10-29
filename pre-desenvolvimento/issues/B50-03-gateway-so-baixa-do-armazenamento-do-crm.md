# B50-03: Gateway só baixa anexo do armazenamento do CRM

**Tipo:** Implementação
**Página:** Gateway do canal direto (repositório whatsapp-gateway)
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-6.md`

## Descrição

O gateway só aceita e só baixa anexo de link https do armazenamento do CRM, sem seguir redirecionamento; o resto é recusado sem ele acessar o endereço.

## Pronto quando

Pedido com link de fora é recusado; o link assinado do CRM continua chegando no celular.

## Critérios de aceite

- **CA-B50-01** (automática) — Link de fora do armazenamento do CRM é recusado. Dado um pedido de envio de mídia cujo link é de outro site, de um endereço interno (`127.0.0.1`, `169.254.169.254`, `localhost`, o IP da VPS) ou do armazenamento por `http`, quando o pedido chega ao gateway, então ele é recusado com erro de pedido inválido, e o gateway não faz nenhuma requisição a esse endereço.
- **CA-B50-02** (automática) — Redirecionamento não é seguido. Dado um link do armazenamento do CRM que responde com redirecionamento para outro endereço, quando o gateway confere o link no pedido ou baixa o arquivo na hora de enviar, então ele não segue o redirecionamento, e a mídia não é enviada.
- **CA-B50-03** (automática) — O link assinado do CRM continua funcionando. Dado um link assinado do armazenamento do CRM, quando o pedido chega e, depois, a mensagem sai da fila, então o pedido é aceito e o arquivo é baixado para o envio, como hoje.
- **CA-B50-04** (manual) — Foto pelo canal direto chega no celular. Dado o gateway novo publicado na VPS e um número do canal direto conectado, quando a Marcelle manda pelo CRM uma foto para o próprio celular, então a foto chega e abre.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B50-01 | O gateway publicado na VPS só atende o CRM de produção; o armazenamento permitido é o do Supabase de produção, configurado por variável de ambiente (o de teste entra só se algum preview usar o gateway) | aberta | — |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B50-04 | Como o gateway decide de onde baixar o anexo? | respondida | Só do armazenamento do CRM, sem seguir redirecionamento (Marcelle, 29/10/2026) |
