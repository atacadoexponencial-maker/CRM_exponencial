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
