# B46-04: Banco de teste sempre acordado

**Tipo:** Implementação
**Página:** Banco de teste sempre acordado
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-banco-de-teste.md`

## Descrição

Criar uma rotina diária que usa o banco de teste, para o plano grátis nunca o
pausar, sem gastar uma das rotinas diárias da Vercel.

## Pronto quando

A rotina roda sozinha todo dia, o banco de teste registra o acesso e, depois de
8 dias sem ninguém testar, ele continua ativo no painel do Supabase.

## Critérios de aceite

- **CA-B46-19** (automática) — a rotina diária usa o banco de teste. Dado a rotina diária ligada, quando ela roda, então o banco de teste registra o acesso do dia, e a produção não recebe nada da rotina.
- **CA-B46-20** (manual) — o banco de teste não pausa. Dado a rotina ligada e 8 dias seguidos sem ninguém rodar teste, quando a Marcelle abre o painel do Supabase, então o projeto do banco de teste aparece ativo, não pausado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-05 | A rotina que mantém o banco acordado não usa nenhuma das rotinas diárias da Vercel, que já estão no limite do plano | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B46-05 | O que fazer com a pausa de 7 dias do plano grátis? | respondida | Uma rotina diária mantém o banco acordado (Marcelle, 27/10/2026) |
