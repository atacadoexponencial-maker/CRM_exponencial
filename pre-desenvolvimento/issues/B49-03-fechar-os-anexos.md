# B49-03: Fechar os anexos para quem é de fora

**Tipo:** Implementação
**Página:** Armazenamento dos anexos
**Spec:** `pre-desenvolvimento/spec-anexos-do-chat-privados.md`

## Descrição

Com o chat, o envio e a limpeza já usando o link com prazo (B49-01 e B49-02), o lugar
dos anexos deixa de ser aberto: o endereço antigo para de abrir, e usuário de outra
empresa não lê o arquivo.

## Pronto quando

O endereço aberto de qualquer anexo dá erro, e o chat e o envio para o celular
continuam funcionando, no preview e na produção.

## Critérios de aceite

- **CA-B49-01** (automática) — O endereço aberto de um anexo não abre mais. Dado um arquivo do chat gravado na empresa A, quando alguém, sem login, abre o endereço público desse arquivo (o formato de link usado até hoje), então recebe erro e não recebe o arquivo.
- **CA-B49-02** (automática) — Usuário de outra empresa não lê o anexo. Dado um arquivo do chat da empresa A, cuja existência foi conferida antes, quando um usuário logado da empresa B tenta baixar esse arquivo com a própria sessão, então o pedido é recusado.
- **CA-B49-08** (manual) — No preview, o chat funciona como antes. Dado o preview do branch, com uma conversa da empresa de teste que tem foto, áudio, vídeo, figurinha e documento, quando a conversa é aberta, então a foto e a figurinha aparecem, o áudio e o vídeo tocam, e o documento mostra a miniatura e baixa.
- **CA-B49-13** (manual) — O arquivo chega no celular. Dado o número conectado da Marcelle, quando ela manda pelo CRM uma foto e um documento para o próprio celular, e dispara uma campanha de teste com anexo para um contato seu, então os três chegam no celular e abrem.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B49-01 | A Meta e o gateway baixam o arquivo logo depois de receber o pedido de envio, dentro de 1 hora; um link de 1 hora basta para eles | invalidada | O gateway guarda o pedido na fila e só baixa o arquivo quando a mensagem sai (whatsapp-gateway, src/envio/enviador.ts); campanha grande leva dias. Virou a PER-B49-03 (Claude, conferido no código em 29/10/2026) |

## Perguntas em aberto

Nenhuma.
