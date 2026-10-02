# B13-06: Lixeira se esvazia sozinha depois de 30 dias

**Tipo:** Implementação
**Página:** — (rotina diária, sem tela)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Rotina diária que apaga de vez (mesmo efeito do "Apagar de vez" da B13-04, inclusive
arquivos de mídia) tudo o que está na lixeira há mais de 30 dias. Só o próprio sistema
pode acionar: chamada de fora sem a credencial do agendador é recusada. Se o caminho for
a rota de cron do Vercel, exige `CRON_SECRET` configurado (hoje não está) — a Marcelle
configura antes de a rotina entrar no ar. Falha num item não impede os outros.

Depende de B13-04.

## Pronto quando

Um contato com data de exclusão de 31 dias atrás some do banco (com cards, conversas e
arquivos) na rodada seguinte da rotina; um de 29 dias continua na lixeira; e chamar a
rotina de fora, sem credencial, é recusado.

## Cenários

### Happy Path
1. Uma vez por dia (cron do Vercel, `0 6 * * *` = 03h de Brasília, com a folga de até 1h
   do plano Hobby), o Vercel chama `/api/cron/lixeira` com `Authorization: Bearer
   <CRON_SECRET>`.
2. A rotina pega os contatos com `excluido_em` há mais de 30 dias (em lotes) e, para cada
   um, faz o mesmo que o "Apagar de vez" da B13-04: apaga os arquivos de mídia do bucket e
   chama `apagar_contato_de_vez`.
3. Responde `{ status: "ok", apagados, falhas }`.

### Edge Cases
- **Sem `CRON_SECRET` configurado, a rotina recusa** (401) — padrão da documentação do
  Vercel (`if (!cronSecret || authHeader !== ...)`). Diferente das rotinas de sequências e
  campanhas, que hoje ficam abertas sem o segredo: esta apaga dados.
- Contato restaurado entre a busca e o apagar: `apagar_contato_de_vez` só age se ele ainda
  estiver na lixeira (devolve `false`), então nada se perde.
- Rodar duas vezes no mesmo dia ou pular um dia: idempotente — sempre "o que passou de 30
  dias", e na rodada seguinte pega o atraso.
- 30 dias contados pelo tempo corrido desde a exclusão (`now() - 30 dias`), o mesmo
  critério do "apaga em N dias" da lixeira.
- Lote de até 200 contatos por rodada, para caber no tempo da função; o resto fica para o
  dia seguinte.

### Cenário de Erro
- Falha num contato não impede os outros; ele fica para a próxima rodada e entra em `falhas`.
- Falha ao apagar arquivo: segue para apagar os dados (arquivo órfão é aceitável; dado não).

## Banco de Dados

Sem mudança — reaproveita `apagar_contato_de_vez` (B13-04).

## Arquivos

- **Modificar:** `src/lib/lixeira.ts` — `arquivosDoContato` passa a morar aqui (sai de
  `lixeira/actions.ts`, que é arquivo de server actions e não deve exportar ajudante) e
  entra `esvaziarLixeiraVencida()`.
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — "Apagar de vez" passa a usar
  `apagarDaLixeira` de `src/lib/lixeira.ts` (o mesmo da limpeza) e o prazo vem de
  `PRAZO_LIXEIRA_DIAS`.
- **Criar:** `src/app/api/cron/lixeira/route.ts` — rota do cron, recusa sem segredo.
- **Modificar:** `vercel.json` — cron `/api/cron/lixeira` diário.

Depende da Marcelle: criar `CRON_SECRET` nas variáveis de ambiente do projeto no Vercel
(Production) e fazer um novo deploy. Com ele configurado, as rotinas de sequências e
campanhas também passam a exigir o segredo (o código delas já confere quando existe) — o
Vercel o envia sozinho, então continuam rodando.

## Dependências Externas

- Vercel Cron Jobs — https://vercel.com/docs/cron-jobs/manage-cron-jobs (segurança com
  `CRON_SECRET`) e https://vercel.com/docs/cron-jobs/usage-and-pricing (Hobby: 100 crons,
  1x por dia, precisão de 1h).

## Checklist

- [x] `arquivosDoContato` e `esvaziarLixeiraVencida` em `src/lib/lixeira.ts`
- [x] Rota `/api/cron/lixeira` recusando sem segredo ou com segredo errado
- [x] Cron diário em `vercel.json`
- [x] Verificação no banco real (teste temporário): contato com 31 dias some (com card,
      conversa e arquivo), um com 29 fica, outro restaurado fica; rota sem credencial = 401 — 2/2 (e a verificação da B13-04 de novo, 3/3), 02/10
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`
- [ ] Push; Marcelle configura `CRON_SECRET` no Vercel e faz redeploy
- [ ] Conferir em produção: `/api/cron/lixeira` sem credencial responde 401
