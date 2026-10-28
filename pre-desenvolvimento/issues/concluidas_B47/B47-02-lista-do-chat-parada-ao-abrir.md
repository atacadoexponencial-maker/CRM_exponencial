# B47-02: A lista do Chat não pula ao abrir uma conversa

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

- **CA-B47-04** (automática) — Abrir conversa não muda a ordem. Dado a lista com as conversas A (mais recente), B e C, quando chega a atualização de C só com `unread_count` zerado, sem `last_message_at` novo, então a ordem continua A, B, C, e C aparece sem não lidas
- **CA-B47-05** (automática) — Mensagem nova continua subindo a conversa. Dado a mesma lista, quando chega a atualização de C com `last_message_at` mais novo que o de A, então a ordem passa a ser C, A, B

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O atendente abre a conversa C, terceira da lista.
2. `marcarComoLidas` zera o `unread_count`; o Realtime manda o UPDATE de C com o mesmo `last_message_at`.
3. A linha de C perde o contador de não lidas e fica no mesmo lugar.

### Edge Cases
- Mensagem nova em C (`last_message_at` diferente do que a lista tem): C sobe para o topo, como hoje.
- Mudança de status ou de etiqueta, sem mensagem: a linha atualiza no lugar.
- Conversa sem `atividadeEm` na lista (mock antigo): conta como mudança de atividade e sobe, para não esconder mensagem nova.
- UPDATE de conversa que não está na lista: nada muda, como hoje.

### Cenário de Erro
- Não há chamada ao servidor nova; o que pode falhar é o payload sem `last_message_at`, tratado como "sem mensagem nova" (atualiza no lugar).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-04 | automática | `src/test/chat-lista-parada-ao-abrir.test.ts` | Com A, B, C, o UPDATE de C só com `unread_count: 0` deixa a ordem A, B, C e C com 0 não lidas |
| CA-B47-05 | automática | `src/test/chat-lista-parada-ao-abrir.test.ts` | O UPDATE de C com `last_message_at` mais novo deixa a ordem C, A, B, com o texto e a atividade novos |

## Arquivos

- **Criar:** `src/app/(auth)/chat/conversa-atualizada.ts` — `aplicarAtualizacaoDaConversa(lista, linha)`: atualiza a conversa no lugar e só a sobe ao topo quando o `last_message_at` mudou.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — o UPDATE de `conversations` passa a usar `aplicarAtualizacaoDaConversa`.
- **Criar:** `src/test/chat-lista-parada-ao-abrir.test.ts` — testes do CA-B47-04 e do CA-B47-05.

Reuso: `formatarHorarioDaLista` (já usado no `chat-layout.tsx`) e o campo `atividadeEm` da `Conversa` (B10-04), que guarda o `last_message_at` em ISO.

## Checklist

- [x] `aplicarAtualizacaoDaConversa` criada, com `atividadeEm` atualizada
- [x] `chat-layout.tsx` usa a função no UPDATE
- [x] Testes do CA-B47-04 e CA-B47-05 passando
- [x] Testes que renderizam o `ChatLayout` passando (L-05), tsc (L-07), lint
