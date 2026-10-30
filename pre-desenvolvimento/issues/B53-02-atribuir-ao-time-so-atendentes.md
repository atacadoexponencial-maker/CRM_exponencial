# B53-02: "Atribuir ao time" escolhe só Atendentes e leva card e contato junto

**Tipo:** Implementação
**Página:** Automações — atribuir ao time
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O rodízio da ação passa a considerar só Atendentes ativos do time; sem nenhum, a ação falha com motivo; o card e o dono do contato acompanham a pessoa escolhida.

## Pronto quando

Rodar a ação num time com Gerente e Atendente sempre entrega ao Atendente, com card e contato junto.

## Critérios de aceite

- **CA-B53-03** (automática) — Rodízio só entre Atendentes. Dado um time com um Gerente sem conversas e um Atendente com 3 conversas abertas, quando a ação "Atribuir ao time" roda para uma conversa sem dono, então a conversa vai para o Atendente.
- **CA-B53-04** (automática) — Time sem Atendente falha com motivo. Dado um time só com Gerente e Admin, quando a ação "Atribuir ao time" roda, então a conversa não muda de dono e o Histórico mostra a ação com falha e o motivo "O time não tem atendente ativo".
- **CA-B53-05** (automática) — Card e contato acompanham a conversa. Dado uma conversa já com um Atendente do time, e o card e o contato com o Gerente, quando a ação "Atribuir ao time" roda, então a conversa fica com o Atendente e o card e o dono do contato passam para ele.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-02 | O card e o dono do contato acompanham a pessoa escolhida por "Atribuir ao time" (hoje só acompanham quando a conversa muda de dono). | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.
