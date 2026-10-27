# B46-04: Esc fecha as janelas e salvar confirma

**Tipo:** Correção
**Página:** Pipeline (Novo lead), Chat (mensagens rápidas), Catálogo, Funis, Campos personalizados, Etiquetas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-01**, **B-05** e **B-07**
**Gravidade:** Médio

## Descrição

Esc não fecha "Novo lead" nem as mensagens rápidas, e quase nenhum salvamento confirma que deu certo; só as automações dizem "salva".

## Pronto quando

Esc fecha essas janelas sem criar nada, e salvar produto, lead, funil, campo e etiqueta mostra uma confirmação curta.

## Critérios de aceite

- **CA-B46-08** (automática) — Esc fecha "Novo lead" e mensagens rápidas. Dado a janela "Novo lead" aberta no Pipeline, ou o painel de mensagens rápidas aberto no Chat, quando se aperta Esc, então a janela fecha e nada é criado
- **CA-B46-09** (automática) — Salvar mostra confirmação. Dado o formulário de produto, de lead, de funil, de campo personalizado ou de etiqueta, quando o salvamento dá certo, então aparece uma confirmação curta ("Produto salvo", "Lead criado", "Funil salvo", "Campo salvo", "Etiqueta salva")

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
