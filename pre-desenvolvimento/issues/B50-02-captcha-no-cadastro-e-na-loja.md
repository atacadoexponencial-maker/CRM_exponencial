# B50-02: CAPTCHA no cadastro e na loja

**Tipo:** Implementação
**Página:** /cadastro e /loja/[endereco]
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-6.md`

## Descrição

O cadastro de empresa e o finalizar pedido da loja só são aceitos com a conferência do Cloudflare Turnstile; com o serviço fora do ar, passam sem ela.

## Pronto quando

Robô sem conferência válida não cria empresa nem pedido; a pessoa passa sem perceber; com a Cloudflare fora do ar, nada trava.

## Critérios de aceite

- **CA-B50-08** (automática) — Cadastro sem conferência válida é recusado. Dado um cadastro de empresa sem conferência do Turnstile ou com uma conferência recusada pelo serviço, quando ele chega ao servidor, então a tela avisa que não foi possível confirmar que é uma pessoa, e nenhuma empresa nem usuário são criados.
- **CA-B50-09** (automática) — Pedido da loja sem conferência válida é recusado. Dado um pedido da loja sem conferência do Turnstile ou com uma conferência recusada pelo serviço, quando ele chega ao servidor, então a loja avisa que não foi possível confirmar que é uma pessoa, e nenhum pedido nem contato são criados.
- **CA-B50-10** (automática) — Com a conferência válida, tudo segue como antes. Dado um cadastro e um pedido da loja com conferência aceita pelo serviço, quando chegam ao servidor, então a empresa nasce com o admin e os times, e o pedido entra no CRM com o contato, como hoje.
- **CA-B50-11** (manual) — A pessoa passa sem perceber. Dado o site no ar, com as chaves reais do Turnstile (o preview usa as de teste, que sempre passam), quando uma pessoa faz um cadastro de teste, apagado depois, e um pedido de teste na loja da empresa de teste, então os dois funcionam, e a conferência não pede nada ou pede só um clique.
- **CA-B50-12** (automática) — Com o Turnstile fora do ar, o cadastro e o pedido passam. Dado o serviço do Turnstile sem responder (erro de rede ou tempo esgotado), com ou sem conferência no pedido, quando um cadastro ou um pedido da loja chega ao servidor, então ele é aceito como hoje; com o serviço no ar, conferência ausente ou inválida continua recusada (CA-B50-08 e CA-B50-09).

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B50-03 | A Marcelle cria a conta gratuita na Cloudflare e o site do Turnstile e passa as duas chaves; a chave pública entra na Vercel como variável `NEXT_PUBLIC_`, e a secreta só no servidor | confirmada | Marcelle criou as chaves em 29/10/2026; Claude as pôs na Vercel (Production, a secreta como sensível) e, nos previews, as chaves de teste públicas da Cloudflare, que sempre passam |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B50-01 | Se o serviço do Turnstile estiver fora do ar, o cadastro e o pedido da loja são recusados (mais seguro) ou passam sem conferência (não perde venda)? | respondida | Passam sem conferência, para não perder venda (Marcelle, 29/10/2026). Só quando o serviço não responde: com ele no ar, conferência ausente ou inválida continua recusada |
| PER-B50-02 | Onde entra o CAPTCHA? | respondida | No cadastro e no "finalizar pedido" da loja; não no login (Marcelle, 29/10/2026) |
| PER-B50-03 | Qual serviço de CAPTCHA? | respondida | Cloudflare Turnstile (Marcelle, 29/10/2026) |
