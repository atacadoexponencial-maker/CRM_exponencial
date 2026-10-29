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

## Cenários

### Happy Path
1. A migration marca o bucket `chat-attachments` como privado.
2. Quem abre o endereço público de um anexo recebe erro.
3. A tela e o envio seguem pelo link assinado (B49-01 e B49-02), que continua abrindo.

### Edge Cases
- Usuário logado de qualquer empresa, com a própria sessão: não baixa nem assina link. O bucket não tem política de leitura desde a B19 (`20261006000006_storage_sem_listagem.sql`).
- Fotos dos produtos do catálogo ficam em outro bucket, que continua público.

### Cenário de Erro
- A migration roda antes de o código da B49-01 e da B49-02 estar no ar: o chat ficaria sem mídia e o envio falharia. Ordem de publicação: push do código, deploy pronto na Vercel e só então `db push` na produção.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B49-01 | automática | `src/test/anexos-do-chat.integration.test.ts` | com o arquivo conferido no bucket, o endereço público sem login responde erro e não devolve o arquivo |
| CA-B49-02 | automática | `src/test/anexos-do-chat.integration.test.ts` | com o arquivo conferido no bucket, o gerente da empresa B não baixa nem assina link dele pela própria sessão |
| CA-B49-08 | manual | roteiro abaixo | no preview, foto, figurinha, áudio, vídeo e documento abrem, tocam e baixam |
| CA-B49-13 | manual | roteiro abaixo | foto, documento e campanha com anexo chegam no celular dela |

### Roteiro manual — CA-B49-08
1. No preview do branch `b49-anexos-privados`, que usa o banco de teste com o bucket já fechado, entrar com a empresa "[TESTE] Automações B11".
2. Abrir a conversa preparada com foto, figurinha, áudio, vídeo e documento recebidos.
3. Conferir: a foto e a figurinha aparecem, o áudio e o vídeo carregam, e o documento mostra a miniatura e baixa. Nenhum link da tela é o endereço público.

### Roteiro manual — CA-B49-13
1. Com a B49 no ar e a migration aplicada na produção, abrir no CRM uma conversa com o seu próprio celular.
2. Mandar uma foto e um documento (PDF): os dois chegam no celular e abrem.
3. Criar uma campanha de teste com imagem para um contato seu e disparar: a imagem chega no celular.

## Banco de Dados

- Bucket `chat-attachments`: `public` passa a `false`. As políticas não mudam: o bucket não tem nenhuma desde a B19.

## Arquivos

- **Criar:** `supabase/migrations/20261029000001_anexos_do_chat_privados.sql` — fecha o bucket
- **Modificar:** `src/test/anexos-do-chat.integration.test.ts` — testes CA-B49-01 e CA-B49-02

## Checklist

- [x] Migration criada e aplicada no banco de teste
- [x] Testes CA-B49-01 e CA-B49-02 passando, e os da B49-01 e da B49-02 ainda passando com o bucket fechado

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B49-08 | Claude, a pedido da Marcelle (roteiro Playwright no preview b49-anexos-privados, 29/10/2026) | 29/10/2026 |
| CA-B49-13 | Marcelle (29/10/2026) | 29/10/2026 |
