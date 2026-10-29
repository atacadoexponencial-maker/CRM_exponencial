# B50-02: CAPTCHA no cadastro e na loja

**Tipo:** Implementação
**Página:** /cadastro e /loja/[endereco]
**Spec:** `docs/specs-arquivadas/spec-seguranca-rodada-6.md`

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

## Cenários

### Happy Path
1. A tela (cadastro ou carrinho) carrega o Turnstile no modo "só aparece se precisar"; a conferência chega sozinha ao formulário.
2. O formulário manda a conferência junto. O servidor confirma com a Cloudflare (`passouNaConferenciaHumana`) antes de qualquer gravação e segue como hoje.
3. Depois de cada envio, a tela gera uma conferência nova (ela vale para um envio só).

### Edge Cases
- Cloudflare fora do ar (erro de rede, tempo de 5 s esgotado ou resposta 5xx): passa (PER-B50-01).
- Sem a chave secreta configurada no servidor: recusa, para a falta dela não desligar a proteção calada.
- Preview: chaves de teste públicas da Cloudflare, que sempre aceitam. Testes do Vitest: a chave de teste que aceita a conferência de teste, posta no `vitest.config.ts`; a da empresa nunca roda nos testes.

### Cenário de Erro
- Conferência ausente ou recusada com a Cloudflare no ar: o cadastro mostra "Não foi possível confirmar que você é uma pessoa. Tente de novo." no primeiro campo; a loja mostra o mesmo aviso acima do botão. Nada é gravado.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B50-08 | automática | `src/test/conferencia-humana.integration.test.ts` | sem conferência e com conferência recusada, o cadastro devolve o erro da conferência e não existem a empresa nem o usuário |
| CA-B50-09 | automática | `src/test/conferencia-humana.integration.test.ts` | sem conferência e com conferência recusada, o pedido devolve o aviso e o número de pedidos e de contatos da loja não muda |
| CA-B50-10 | automática | `src/test/conferencia-humana.integration.test.ts` | com conferência aceita, a empresa nasce com os times Entrada e Recompra, e o pedido entra com um contato novo |
| CA-B50-11 | manual | roteiro abaixo | no site no ar, cadastro e pedido de teste passam sem pedir nada ou com um clique |
| CA-B50-12 | automática | `src/test/conferencia-humana.integration.test.ts` | com a Cloudflare derrubada, cadastro e pedido sem conferência entram; com ela de volta, o pedido sem conferência é recusado |

### Roteiro manual — CA-B50-11
1. Com a B50-02 no ar, abrir `https://crm-exponencial.vercel.app/cadastro` numa janela anônima, preencher com um e-mail de teste e criar a conta. Conferir que nada pede para provar que é pessoa (ou só uma caixinha) e que a conta nasce. Apagar a empresa de teste em seguida.
2. Abrir a loja da empresa de teste, pôr um produto no carrinho, preencher nome e WhatsApp e fazer o pedido. Conferir que o pedido é registrado.

## Arquivos

- **Criar:** `src/lib/conferencia-humana.ts` — confirma a conferência com a Cloudflare; passa quando ela não responde
- **Criar:** `src/components/shared/conferencia-humana.tsx` — o Turnstile na tela, que entrega a conferência ao formulário
- **Modificar:** `src/app/cadastro/actions.ts` — o cadastro confere antes de criar
- **Modificar:** `src/app/cadastro/page.tsx` — o Turnstile no formulário e o aviso
- **Modificar:** `src/app/loja/[endereco]/actions.ts` — o pedido confere antes de reservar a vaga e gravar
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — passa a conferência ao pedido
- **Modificar:** `src/app/loja/components/carrinho.tsx` — o Turnstile acima do botão de pedido
- **Modificar:** `vitest.config.ts` — a chave secreta de teste pública da Cloudflare nos testes
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — manda a conferência de teste
- **Modificar:** `src/test/cadastro-seguranca.integration.test.ts` — manda a conferência de teste
- **Modificar:** `src/test/fim-das-sequencias.test.tsx` — manda a conferência de teste
- **Modificar:** `src/test/limite-de-tentativas-seguranca.integration.test.ts` — manda a conferência de teste
- **Modificar:** `src/test/loja-limites-que-valem.integration.test.ts` — manda a conferência de teste
- **Modificar:** `src/test/pedido-loja-seguranca.integration.test.ts` — manda a conferência de teste
- **Criar:** `src/test/conferencia-humana.integration.test.ts` — testes da B50-02

## Dependências Externas

- Cloudflare Turnstile — script `challenges.cloudflare.com/turnstile/v0/api.js` na tela e `siteverify` no servidor. Sem pacote novo.

## Checklist

- [x] Conferência no servidor, com a regra de "fora do ar passa"
- [x] Turnstile no cadastro e no carrinho, gerado de novo a cada envio
- [x] Testes antigos do cadastro e da loja mandando a conferência de teste
- [x] Testes da tabela Prova passando; tsc e lint limpos; testes vizinhos rodados (L-05)

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B50-11 | Claude, a pedido da Marcelle | 29/10/2026 |
