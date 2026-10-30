# B53-13: "Repetir pedido" mantém nome e WhatsApp

**Tipo:** Implementação
**Página:** Loja
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

A loja passa a lembrar, no navegador da cliente, o nome e o WhatsApp do último pedido e a preenchê-los ao repetir.

## Pronto quando

Repetir o pedido traz o carrinho e o formulário preenchidos.

## Critérios de aceite

- **CA-B53-26** (automática) — Repetir pedido mantém nome e WhatsApp. Dado uma cliente que fez um pedido com nome e WhatsApp naquele navegador, quando ela volta à loja e usa "Repetir pedido", então o carrinho é refeito e o nome e o WhatsApp vêm preenchidos.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-05 | A loja guarda nome e WhatsApp só no navegador da cliente, nunca no servidor além do pedido que já grava. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A cliente faz um pedido na loja com nome "Ana Souza" e WhatsApp "(21) 98888-7777".
2. O pedido dá certo: o último pedido guardado no navegador (`ultimo-pedido:<loja>`, B31-05) passa a levar, além das peças, o nome e o WhatsApp como ela digitou.
3. Ela volta à loja depois; o carrinho vazio (ou o cabeçalho da vitrine) oferece "Repetir último pedido".
4. Ela repete: o carrinho é refeito com as peças de hoje e os campos "Seu nome" e "Seu WhatsApp com DDD" vêm preenchidos; ela pode apagar e digitar outros.

### Edge Cases
- Último pedido guardado antes desta issue (sem nome e WhatsApp): repetir refaz o carrinho e os campos ficam como estão.
- Dado guardado com formato estranho (não texto): é ignorado, os campos não são preenchidos.
- Navegador sem armazenamento (aba anônima bloqueada): vale só enquanto a página está aberta, como o resto do carrinho.
- Nada vai para o servidor além do pedido que já é gravado (SUP-B53-05).

### Cenário de Erro
- A repetição falha no servidor (loja fora do ar, nenhuma peça): aparece o aviso de hoje e os campos não são mexidos.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-26 | automática | `src/test/loja-repetir-pedido-com-nome.test.tsx` | depois de um pedido feito com nome e WhatsApp, numa nova visita à loja "Repetir último pedido" refaz o carrinho com as peças e traz os campos nome e WhatsApp preenchidos |

## Arquivos

- **Modificar:** `src/app/loja/components/carrinho-local.ts` — o último pedido guardado leva o nome e o WhatsApp da cliente (opcional, conferido ao ler).
- **Modificar:** `src/app/loja/components/carrinho.tsx` — `onPedidoFeito` entrega também o nome e o WhatsApp; nova prop para preencher os campos ao repetir.
- **Modificar:** `src/app/loja/[endereco]/usar-carrinho-loja.tsx` — guarda o nome e o WhatsApp com o último pedido e, ao repetir, manda preencher os campos.
- **Criar:** `src/test/loja-repetir-pedido-com-nome.test.tsx` — teste do CA-B53-26 (pedido feito, nova visita, repetir).

## Checklist

- [x] Último pedido guardado com nome e WhatsApp
- [x] Carrinho entrega nome e WhatsApp ao fazer o pedido e aceita os campos preenchidos de fora
- [x] Repetir preenche nome e WhatsApp
- [x] Teste do CA-B53-26
- [x] Rodar os testes da loja e o tsc
