# B53-12: Grade fechada cobrada pelo preço do pacote

**Tipo:** Implementação
**Página:** Loja
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O total do pedido com grade fechada passa a sair do preço do pacote, sem a soma dos preços por peça arredondados.

## Pronto quando

Uma grade de R$ 140 sai R$ 140,00 na loja e no pedido do CRM.

## Critérios de aceite

- **CA-B53-25** (automática) — Grade de R$ 140 é cobrada R$ 140. Dado uma grade fechada de 6 peças por R$ 140, quando a cliente pede 1 e 2 grades, então o total do pedido gravado é R$ 140,00 e R$ 280,00, na loja e no pedido do CRM.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
