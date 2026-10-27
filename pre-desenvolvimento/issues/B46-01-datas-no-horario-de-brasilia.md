# B46-01: Datas e horas no horário de Brasília em todo o CRM

**Tipo:** Correção
**Página:** Todas (histórico do card, lixeira, campanhas, agenda, chat, relatórios)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-02**, **B-06** e **B-11**
**Gravidade:** Alto

## Descrição

As datas formatadas no servidor saem em UTC, porque a Vercel roda em UTC e as chamadas a `toLocale*` não dizem o fuso. O histórico do card mostra 3 horas a mais, às vezes no futuro, e a mesma data sai diferente no servidor e no navegador (provável causa do erro React #418 em `/campanhas`).

## Pronto quando

O histórico do card, a lixeira e as campanhas mostram a mesma hora, a de Brasília, e `/campanhas` abre sem erro no console.

## Critérios de aceite

- **CA-B46-01** (automática) — Histórico do card na hora de Brasília. Dado um card movido às 15:00 de Brasília (18:00 UTC), com o servidor em UTC, quando o histórico do card é montado, então o movimento aparece com "15:00", e não "18:00"
- **CA-B46-02** (automática) — Nenhuma data na tela sem fuso. Dado o código das telas em `src/app` e `src/components`, quando se procura `toLocaleString`, `toLocaleDateString` ou `toLocaleTimeString` sem `timeZone`, então não há nenhum: toda data passa pelo fuso da operação
- **CA-B46-03** (manual) — Campanhas abrem sem erro de hidratação. Dado a empresa de teste em produção, depois da mudança, quando se abre `/campanhas` com o console aberto, então não aparece o erro React #418, e as datas da lista são as de Brasília

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-01 | O fuso de todas as telas é o da operação (`America/Sao_Paulo`, já em `src/lib/datas.ts`), para todas as empresas | confirmada | Brasília é o padrão. Luan, 27/10/2026, que pediu também uma configuração para trocar o fuso: fica na B46-14, separada desta |

## Perguntas em aberto

Nenhuma.
