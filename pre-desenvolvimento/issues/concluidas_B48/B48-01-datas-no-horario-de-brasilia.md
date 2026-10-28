# B48-01: Datas e horas no horário de Brasília em todo o CRM

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

- **CA-B48-01** (automática) — Histórico do card na hora de Brasília. Dado um card movido às 15:00 de Brasília (18:00 UTC), com o servidor em UTC, quando o histórico do card é montado, então o movimento aparece com "15:00", e não "18:00"
- **CA-B48-02** (automática) — Nenhuma data na tela sem fuso. Dado o código das telas em `src/app` e `src/components`, quando se procura formatação de data (`toLocaleDateString`, `toLocaleTimeString`, `toLocaleString` de uma data ou `Intl.DateTimeFormat`) sem `timeZone`, então não há nenhum: toda data passa pelo fuso da operação
- **CA-B48-03** (manual) — Campanhas abrem sem erro de hidratação. Dado a empresa de teste em produção, depois da mudança, quando se abre `/campanhas` com o console aberto, então não aparece o erro React #418, e as datas da lista são as de Brasília

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-01 | O fuso de todas as telas é o da operação (`America/Sao_Paulo`, já em `src/lib/datas.ts`), para todas as empresas | confirmada | Brasília é o padrão. Luan, 27/10/2026, que pediu também uma configuração para trocar o fuso: fica na B48-14, separada desta |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Um card é movido às 15:00 de Brasília (18:00 UTC). O histórico, montado no servidor em UTC, mostra "27/10/2026, 15:00".
2. As listas de campanhas, o relatório da campanha, o aviso de freio do WhatsApp, o rascunho do editor de automação e a fila da campanha mostram a hora de Brasília, no servidor e no navegador.

### Edge Cases
- Nota escrita às 22:30 de Brasília (01:30 UTC do dia seguinte): a data é a de Brasília.
- Data de calendário sem hora (data da compra, data agendada da campanha): mostrada como está, sem passar por fuso, para não voltar um dia.
- Rótulos das semanas do gráfico do Dashboard: as semanas são contadas a partir da meia-noite do processo (UTC); o rótulo diz a data desse começo, em UTC. Contar as semanas em Brasília é outra mudança, que fica para a B48-14.

### Cenário de Erro
- Sem consulta nova; uma data inválida continua como antes (o `Intl` devolve "Invalid Date").

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-01 | automática | `src/test/datas-no-horario-de-brasilia.test.ts` | Com o processo em UTC, `buscarDadosPainel` devolve o movimento das 18:00 UTC como "27/10/2026, 15:00" e a nota das 01:30 UTC como 27/10 |
| CA-B48-02 | automática | `src/test/datas-no-horario-de-brasilia.test.ts` | Nenhuma chamada de formatação de data em `src/app`, `src/components` e `src/lib` sem `timeZone` |
| CA-B48-03 | manual | roteiro abaixo | `/campanhas` sem o erro React #418 e com a hora de Brasília |

### Roteiro manual — CA-B48-03
1. No preview do branch, entre na empresa "[TESTE] Automações B11" e abra o console do navegador (F12).
2. Abra `/campanhas`.
3. Confira que não aparece "Minified React error #418" e que a data de envio das campanhas é a de Brasília.

## Arquivos

- **Modificar:** `src/lib/datas.ts` — `formatarDataEHora`, `formatarData`, `formatarDiaDoMes` e `formatarDataDoCalendario`, no fuso da operação.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — histórico, notas e entrada na etapa pelo fuso.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — data da compra como data de calendário.
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — data de envio pelo fuso.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — datas do relatório pelo fuso.
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — data agendada como data de calendário.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/aviso-de-freio.tsx` — "desde" pelo fuso.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — hora do rascunho pelo fuso.
- **Modificar:** `src/lib/whatsapp/gateway/fila-campanha.ts` — "termina em" pelo fuso.
- **Modificar:** `src/app/exclusao-de-dados/[code]/page.tsx` — data da solicitação pelo fuso.
- **Modificar:** `src/lib/metricas-dashboard.ts` — rótulo das semanas em UTC, escrito.
- **Criar:** `src/test/datas-no-horario-de-brasilia.test.ts` — testes do CA-B48-01 e do CA-B48-02.

Reuso: `FUSO_DA_OPERACAO` e os formatadores de `src/lib/datas.ts`.

## Checklist

- [x] Formatadores novos em `src/lib/datas.ts`
- [x] Todas as datas das telas pelo fuso, e as de calendário sem fuso
- [x] Testes do CA-B48-01 e do CA-B48-02 passando
- [x] Testes que usam esses arquivos passando (as 5 falhas de tema e foto já existem na master), tsc e lint

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B48-03 | Luan | 28/10/2026 |
