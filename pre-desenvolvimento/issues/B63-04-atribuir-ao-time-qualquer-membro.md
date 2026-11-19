# B63-04: "Atribuir ao time" escolhe qualquer membro

**Tipo:** Implementação
**Página:** Automações (ação "Atribuir ao time")
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

A ação "Atribuir ao time" volta a escolher entre todos os membros ativos do time, de
qualquer cargo (desfaz a B53-02). Continua: menos conversas abertas recebe, empate pelo
nome, conversa já com um membro ativo do time fica com ele. Time sem membro ativo
falha com "O time não tem membro ativo".

## Pronto quando

Um time com a Nathália e a Vivianne distribui leads entre as duas, pela carga.

## Critérios de aceite

- **CA-B63-16** (automática) — O Admin do time pode receber o lead. Dado um time com a atendente Ana (3 conversas abertas) e o Admin (1 conversa aberta), os dois ativos, quando "Atribuir ao time" roda para um lead novo, então o lead vai para o Admin.
- **CA-B63-17** (automática) — Conversa já com um Gerente do time fica com ele. Dado um time com a Ana e um Gerente, e uma conversa que já é do Gerente, quando "Atribuir ao time" roda para essa conversa, então ela continua com o Gerente, e a execução registra que manteve o dono.
- **CA-B63-18** (automática) — Time sem ninguém ativo avisa a falha. Dado um time cujos membros estão todos desativados, quando "Atribuir ao time" roda, então a conversa não muda de dono, e a execução da automação mostra "O time não tem membro ativo".

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-03 | "Atribuir ao time" escolhe qualquer membro ativo do time, de qualquer cargo. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.
