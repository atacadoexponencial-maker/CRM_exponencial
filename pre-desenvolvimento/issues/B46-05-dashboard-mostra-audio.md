# B46-05: O Dashboard mostra "Áudio", e não o endereço do arquivo

**Tipo:** Correção
**Página:** Dashboard (Esperando resposta)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achado **M-04**
**Gravidade:** Médio

## Descrição

Em "Esperando resposta", a última mensagem de mídia aparece crua ("[audio] https://…"), enquanto o Chat mostra "Áudio".

## Pronto quando

O Dashboard resume a mídia do mesmo jeito que o Chat.

## Critérios de aceite

- **CA-B46-10** (automática) — Resumo da mídia sem endereço. Dado uma conversa cuja última mensagem é "[audio] https://…supabase.co/storage/…", quando o Dashboard monta "Esperando resposta", então a linha mostra "Áudio", sem o endereço

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
