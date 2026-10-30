# B53-15: Iniciais do avatar ignoram símbolos

**Tipo:** Implementação
**Página:** Avatar (contato, usuário e time)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Uma regra só de iniciais, usada por contato, usuário e time, que ignora símbolos.

## Pronto quando

"[TESTE] Automações B11" aparece como "TB".

## Critérios de aceite

- **CA-B53-30** (automática) — Iniciais ignoram símbolos. Dado os nomes "[TESTE] Automações B11", "Loja Beta" e "(11) 99999-0000", quando o avatar é montado, então as iniciais são "TB", "LB" e "19".

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.
