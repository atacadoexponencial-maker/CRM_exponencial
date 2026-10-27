# B46-17: Atalhos do Chat para a ficha e do pedido para a conversa

**Tipo:** Correção
**Página:** Chat (cabeçalho) e Pedidos
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **C-09** e **C-19**
**Gravidade:** Clareza

## Descrição

Do chat não há como ir à ficha do contato, e do pedido não há como abrir a conversa.

## Pronto quando

O nome no cabeçalho do chat leva à ficha, e o pedido tem "Abrir conversa".

## Critérios de aceite

- **CA-B46-43** (automática) — Do chat para a ficha do contato. Dado uma conversa aberta com contato cadastrado, quando se olha o cabeçalho, então o nome do contato é um link para `/contatos/<id>`
- **CA-B46-44** (automática) — Do pedido para a conversa. Dado um pedido de contato que tem conversa, quando o pedido é aberto, então há "Abrir conversa" ao lado de "Perfil do contato", levando à conversa dele no Chat

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
