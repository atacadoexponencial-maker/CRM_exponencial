# B53-09: Agenda: follow-up de hoje sem horário e "Adiar" pelo horário original

**Tipo:** Implementação
**Página:** Agenda
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

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

## Cenários

### Happy Path
1. A pessoa agenda um follow-up para hoje sem hora: o servidor lê o relógio no fuso da empresa e salva para a próxima hora cheia (14:20 → 15:00; 14:00 → 15:00).
2. Outro dia sem hora continua indo para 09:00; com hora, vale a hora digitada.
3. "Adiar N dias" soma N dias de calendário ao vencimento atual do lembrete, mantendo o horário dele no fuso da empresa.

### Edge Cases
- Agora depois das 23h (23:00 a 23:59): sem hora, o follow-up de hoje vai para 23:59 (SUP-B53-03).
- Lembrete atrasado cuja soma ainda fica no passado: vai para hoje + N dias, no mesmo horário do original.
- Lembrete de hoje cujo horário já passou: original + N já cai no futuro e vale.

### Cenário de Erro
- Data com hora digitada no passado continua recusada com "A data do follow-up já passou."
- Prazo diferente de 1, 3 ou 7 continua "Prazo inválido"; lembrete inexistente, feito ou fora do alcance da pessoa (RLS) não muda e devolve "Não foi possível adiar o lembrete".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-19 | automática | `src/test/agenda-vencimento.test.ts` | Com o relógio fixo em 14:20 de Brasília, follow-up de hoje sem hora sai para hoje às 15:00, sem erro; 14:00 vai para 15:00 e 23:20 para 23:59 |
| CA-B53-20 | automática | `src/test/agenda-adiar.integration.test.ts` | Lembrete de amanhã às 10:00 adiado 1 dia fica no banco para depois de amanhã às 10:00 |
| CA-B53-21 | automática | `src/test/agenda-adiar.integration.test.ts` | Lembrete de 3 dias atrás às 10:00 adiado 1 dia fica no banco para amanhã às 10:00 |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Criar:** `src/app/(auth)/agenda/vencimento.ts` — funções puras do vencimento: `lerVencimento` (sai de `actions.ts` e ganha a próxima hora cheia de hoje) e `vencimentoAoAdiar` (soma ao horário original, nunca no passado). Reusa `instanteNoFuso`, `diaNoFuso`, `relogioNoFuso` e `formatarNoFuso` de `src/lib/datas.ts`.
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — `criarFollowUp` e `editarLembrete` usam o `lerVencimento` novo; `adiarLembrete` lê o `due_at` atual e grava `vencimentoAoAdiar`.
- **Criar:** `src/test/agenda-vencimento.test.ts` — CA-B53-19 com `vi.setSystemTime`.
- **Criar:** `src/test/agenda-adiar.integration.test.ts` — CA-B53-20 e CA-B53-21 no banco de teste.

## Checklist

- [x] Criar `vencimento.ts` com `lerVencimento` (próxima hora cheia hoje, 23:59 depois das 23h, 09:00 nos outros dias) e `vencimentoAoAdiar`
- [x] `actions.ts`: tirar o `lerVencimento` local e importar o novo
- [x] `adiarLembrete`: ler o `due_at` do lembrete pendente e gravar `vencimentoAoAdiar(due_at, dias, fuso)`
- [x] Testes da tabela Prova
