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

## Cenários

### Happy Path
1. A última mensagem do cliente é um áudio (conteúdo gravado: o endereço do arquivo).
2. O Dashboard mostra em "Esperando resposta" a linha com "🎤 Áudio", como a lista do Chat.

### Edge Cases
- Foto, vídeo, documento, figurinha, localização e contato: a prévia do tipo, a mesma da lista do Chat.
- Texto: aparece como veio.
- Tipo que o CRM não conhece: "Mensagem não suportada por aqui", como no Chat (antes saía "[tipo] conteúdo").

### Cenário de Erro
- Sem mudança na consulta; o tipo vazio conta como texto.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B46-10 | automática | `src/test/dashboard-previa-da-midia.test.ts` | `listarEsperandoResposta` devolve "🎤 Áudio" para o áudio com endereço, sem "https://", e a prévia do tipo para foto, vídeo e documento |

## Arquivos

- **Modificar:** `src/lib/whatsapp/recebimento.ts` — `previaDaMensagemGravada(tipo, conteudo)`, sobre o `PREVIA_POR_TIPO` que o recebimento já usa.
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — `listarEsperandoResposta` usa `previaDaMensagemGravada`.
- **Criar:** `src/test/dashboard-previa-da-midia.test.ts` — testes do CA-B46-10.

Reuso: `PREVIA_POR_TIPO` de `src/lib/whatsapp/recebimento.ts`, a mesma prévia gravada em `last_message_text` para a lista do Chat.

## Checklist

- [x] `previaDaMensagemGravada` criada sobre o `PREVIA_POR_TIPO`
- [x] "Esperando resposta" usa a prévia
- [x] Testes do CA-B46-10 e os que usam o recebimento e o Dashboard passando, tsc e lint
