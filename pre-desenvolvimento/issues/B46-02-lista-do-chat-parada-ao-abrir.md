# B46-02: A lista do Chat não pula ao abrir uma conversa

**Tipo:** Correção
**Página:** Chat (lista de conversas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-03**
**Gravidade:** Médio

## Descrição

Abrir uma conversa zera as não lidas, o Realtime avisa a mudança, e a lista põe no topo toda conversa que muda (`chat-layout.tsx`), mesmo sem mensagem nova. A lista mexe embaixo do mouse.

## Pronto quando

Abrir qualquer conversa deixa a lista na mesma ordem; só mensagem nova sobe a conversa.

## Critérios de aceite

- **CA-B46-04** (automática) — Abrir conversa não muda a ordem. Dado a lista com as conversas A (mais recente), B e C, quando chega a atualização de C só com `unread_count` zerado, sem `last_message_at` novo, então a ordem continua A, B, C, e C aparece sem não lidas
- **CA-B46-05** (automática) — Mensagem nova continua subindo a conversa. Dado a mesma lista, quando chega a atualização de C com `last_message_at` mais novo que o de A, então a ordem passa a ser C, A, B

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
