# B53-09: Agenda: follow-up de hoje sem horário e "Adiar" pelo horário original

**Tipo:** Implementação
**Página:** Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Follow-up para hoje sem horário vai para a próxima hora cheia; "Adiar 1, 3 ou 7 dias" soma ao horário original, sem cair no passado.

## Pronto quando

Agendar para hoje sem horário funciona a qualquer hora e adiar mantém o horário do lembrete.

## Critérios de aceite

- **CA-B53-19** (automática) — Follow-up de hoje sem horário vai para a próxima hora cheia. Dado agora 14:20 em Brasília, quando a pessoa agenda um follow-up para hoje sem horário, então ele é salvo para hoje às 15:00, sem o erro "a data já passou".
- **CA-B53-20** (automática) — Adiar soma ao horário original. Dado um lembrete para amanhã às 10:00, quando a pessoa usa "Adiar 1 dia", então ele passa para depois de amanhã às 10:00.
- **CA-B53-21** (automática) — Adiar lembrete atrasado nunca cai no passado. Dado um lembrete atrasado de 3 dias atrás às 10:00, quando a pessoa usa "Adiar 1 dia", então ele passa para amanhã às 10:00.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-03 | Follow-up de hoje sem horário depois das 23h vai para 23:59 de hoje. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026. |

## Perguntas em aberto

Nenhuma.
