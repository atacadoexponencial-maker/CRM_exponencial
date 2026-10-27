# B44-05: Campanha sai uma vez só, não trava a fila e pula contato apagado

**Tipo:** Implementação
**Página:** Campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O envio da campanha passa a reservar cada destinatário antes de enviar, campanhas que não têm como sair viram "Interrompida" e saem da fila, e contato apagado de vez não recebe nem no envio nem no reenvio.

## Pronto quando

Duas execuções simultâneas mandam uma mensagem por destinatário; uma empresa com campanhas travadas não segura a campanha de outra; o relatório mostra o contato apagado como não enviado com o motivo "contato apagado".

## Critérios de aceite

- **CA-B44-18** (automática) — Envio simultâneo não manda a mesma mensagem duas vezes. Dado uma campanha "Enviando" com 40 destinatários pendentes, quando duas execuções do envio rodam ao mesmo tempo, então cada destinatário recebe exatamente uma mensagem e o relatório mostra 40 envios
- **CA-B44-19** (automática) — Campanha que não tem como sair vira "Interrompida". Dado uma campanha "Enviando" cujo conteúdo não pode ser enviado, quando o envio automático roda, então a campanha aparece como "Interrompida", com o motivo dito na tela, e sai da fila
- **CA-B44-20** (automática) — Campanhas travadas de uma empresa não seguram a de outra. Dado a empresa A com 3 ou mais campanhas "Enviando" que não têm como sair e a empresa B com uma campanha válida "Enviando", quando o envio automático roda uma vez, então a campanha de B começa a sair nessa mesma rodada
- **CA-B44-21** (automática) — Contato apagado de vez não recebe a campanha. Dado uma campanha com lista montada que inclui o contato C, e C ainda pendente, quando C é apagado de vez e a campanha é enviada, então C não recebe a mensagem e o relatório mostra que ele não foi enviado porque o contato foi apagado
- **CA-B44-22** (automática) — Reenvio para falhas pula contato apagado de vez. Dado uma campanha em que o envio para o contato C falhou, quando C é apagado de vez e o Gerente reenvia para quem falhou, então C não recebe a mensagem

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-02 | Campanha que não tem como sair vira "Interrompida" com motivo, reaproveitando o status que já existe para quem para no meio. Ela não é apagada nem cancelada | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-08 | O contato apagado de vez aparece no relatório da campanha como não enviado, com o motivo "contato apagado" | confirmada | Marcelle, 27/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O envio automático (cron, a cada rodada) ou o botão "Retomar" chama o motor.
2. O motor lê todas as campanhas "Enviando" em ordem de chegada (agendamento, depois criação). As que não têm como sair viram "Interrompida", com o motivo na tela, e saem da fila. Das que podem sair, pega as 3 primeiras.
3. Para cada destinatário pendente, o motor primeiro **reserva** o destinatário (marca de reserva gravada só se ninguém reservou há menos de 10 minutos). Só quem consegue a reserva envia.
4. Destinatário cujo contato foi apagado de vez (sem contato ligado) não recebe: vira "Excluído" com o motivo "Contato apagado".

### Edge Cases
- Duas execuções ao mesmo tempo: as duas leem os mesmos pendentes, mas só uma reserva cada destinatário. Cada número recebe uma mensagem.
- Execução que caiu no meio do lote: a reserva vence em 10 minutos e o destinatário volta a poder sair.
- Reenvio para falhas: o destinatário cujo contato foi apagado de vez não entra na lista do reenvio. Se entrar por outro caminho, o motor o pula do mesmo jeito.
- Campanha "Interrompida" por texto sem reserva e retomada sem ajuste: na próxima rodada é interrompida de novo.

### Cenário de Erro
- Falha ao gravar a reserva: o destinatário fica para a próxima rodada, sem envio.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-18 | automática | `src/test/campanhas-envio-uma-vez.test.ts` | duas execuções simultâneas sobre 40 pendentes mandam exatamente uma mensagem por número (40 envios no total) |
| CA-B44-19 | automática | `src/test/campanhas-envio-uma-vez.test.ts` | campanha "Enviando" com texto que não pode sair vira "Interrompida" com motivo e não envia nada |
| CA-B44-20 | automática | `src/test/campanhas-envio-uma-vez.test.ts` | com 3 campanhas travadas de A e uma válida de B, a de B envia na mesma rodada |
| CA-B44-21 | automática | `src/test/campanhas-envio-uma-vez.test.ts` | destinatário sem contato (apagado de vez) não recebe e fica "excluido" com motivo "Contato apagado" |
| CA-B44-22 | automática | `src/test/campanhas-envio-uma-vez.test.ts` | campanha de reenvio com o destinatário de contato apagado não manda para ele |

O motor é testado com banco em memória, como em `src/test/campanhas-motor-seguranca.test.ts`: o motor real processaria as campanhas "Enviando" de produção. O banco em memória aplica a reserva como o Postgres, de uma vez só por chamada.

## Banco de Dados

- Tabela: `campaign_recipients`
  - `reservado_em` (timestamptz, nulo) — quando uma execução do motor reservou o destinatário para enviar. Reserva com mais de 10 minutos é considerada abandonada.

## Arquivos

- **Criar:** `supabase/migrations/20261027000003_reserva_do_destinatario.sql` — coluna `reservado_em`
- **Modificar:** `src/lib/campanhas.ts` — fila em ordem de chegada que interrompe a campanha que não tem como sair; reserva do destinatário antes do envio; destinatário sem contato vira "excluido" com motivo
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — o reenvio para falhas não inclui destinatário sem contato
- **Criar:** `src/test/campanhas-envio-uma-vez.test.ts` — CA-B44-18 a 22
- **Modificar:** `src/test/campanhas-segmentacao-motor.test.ts` — o banco em memória do teste da B42 ganha o filtro `or` e passa a aplicar a alteração no `maybeSingle`, para a reserva do destinatário funcionar nele; o que o teste confere não muda

## Checklist

- [x] Migration da reserva
- [x] Fila ordenada, com interrupção da campanha que não tem como sair
- [x] Reserva do destinatário antes do envio
- [x] Destinatário de contato apagado pulado no envio e no reenvio
- [x] Testes do CA-B44-18 a 22
