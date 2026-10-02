# B13-03: Contato na lixeira não aparece nem dispara nada no resto do sistema

**Tipo:** Implementação
**Página:** Agenda, Alertas, Sequências, Campanhas, Automações, Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Fazer o resto do sistema ignorar o que está na lixeira, conforme a spec: lembretes fora
da Agenda (e da agenda da equipe), cards fora dos Alertas, sequências em andamento do
contato encerradas ao excluir e nenhuma mensagem de sequência enviada, contato fora da
seleção e da contagem de público das Campanhas e pulado em campanha em andamento
(relatório mostra "excluído"), nenhuma automação disparada, e Dashboard e Performance
sem contar contatos e cards na lixeira.

Depende de B13-02.

## Pronto quando

No CRM publicado, depois de excluir um contato que tinha lembrete, alerta, sequência em
andamento e estava no público de uma campanha: ele não aparece na Agenda nem nos
Alertas, a sequência dele consta como encerrada, a campanha não o conta, e os números do
Dashboard caem na medida dele.

## Cenários

Levantamento de 02/10 (varredura de agenda, alertas, sequências, campanhas, automações e
dashboard). **Já limpos pela regra de leitura da B13-02:** Alertas (`alertas/actions.ts`
deriva tudo de cards), Performance e as métricas do Dashboard que vêm de cards e
histórico. O que ainda vaza está abaixo.

### Happy Path
1. **Ao excluir** (`mandarParaLixeira`), as execuções de sequência `em_andamento` do
   contato viram `cancelada` (`proxima_execucao = null`, `finished_at = now()`) — mesmo
   formato do `cancelarSequenciaRun` que já existe. Não voltam ao restaurar (premissa
   aprovada).
2. **Agenda:** lembretes e "sequências em andamento" de contato na lixeira somem da
   minha agenda, da agenda da equipe e do selo de atrasados no menu (regra de leitura de
   `reminders` e `sequence_runs`, como na B13-02). Ao restaurar, os lembretes pendentes
   voltam sozinhos.
3. **Follow-up:** a busca de contatos para follow-up não mostra quem está na lixeira, e
   criar follow-up para contato na lixeira é recusado no servidor.
4. **Sequência manual:** iniciar sequência para contato na lixeira é recusado no servidor.
5. **Cron de sequências:** execução cujo contato está na lixeira não envia nada nem cria
   lembrete; é marcada `cancelada`.
6. **Campanhas — público:** contato na lixeira não entra na contagem, na prévia, no
   instantâneo de destinatários ao confirmar, no reenvio de falhas, nem nas opções de
   nicho/tag da segmentação.
7. **Campanhas — disparo:** destinatário `pendente` cujo contato foi para a lixeira depois
   da confirmação não recebe a mensagem; vira `excluido` e o relatório mostra "Excluído".
8. **Automações:** `processarAutomacoes` não faz nada para contato na lixeira.
9. **Dashboard:** faturamento, ticket médio e "% de clientes novos" (de
   `contact_purchases`) ignoram compras de contato na lixeira; ao restaurar, voltam.

### Edge Cases
- Lembrete pendente de uma sequência que foi cancelada na exclusão: volta ao restaurar
  (é um lembrete, decisão da spec); marcá-lo como feito não reativa a sequência, porque
  `avancarAposLembrete` só age em execução `em_andamento` — conferir na execução.
- Campanha já `enviada`: o relatório continua mostrando quem recebeu (registro
  histórico); só o `pendente` vira `excluido`.
- Contato restaurado antes do disparo: recebe normalmente (a checagem é na hora do envio).
- `excluirSequencia` bloqueia quando há execução em andamento: as do contato na lixeira já
  foram canceladas, então não bloqueiam.
- Fora desta issue (B13-05): `criarNovoLead`/`criarContato` com telefone de contato na
  lixeira e mensagem recebida (webhook da Meta e gateway), que hoje reaproveitam o contato.

### Cenário de Erro
- Falha ao cancelar as sequências na exclusão: a exclusão já foi gravada; o cron as
  cancela na próxima rodada (checagem do item 5), então nada é enviado.
- Falha ao marcar o destinatário como `excluido`: o envio daquele destinatário não
  acontece mesmo assim (a checagem vem antes do envio).

## Banco de Dados

Migration `supabase/migrations/20261002000005_lixeira_agenda_sequencias_campanhas.sql`:
- `reminders` — políticas "Lembretes visíveis por papel" (SELECT) e "Atualização de
  lembretes por papel" (UPDATE) + `and not public.contato_na_lixeira(contact_id)`.
- `sequence_runs` — políticas "Execuções visíveis por papel" (SELECT) e "Cancelamento por
  papel" (UPDATE) + idem.
- `campaign_recipients.status` — regra passa a aceitar também `excluido`.
- Aplicar com `db push`; regenerar `types.ts` só se mudar algo tipado (status é texto).

## Arquivos

- **Criar:** `supabase/migrations/20261002000005_lixeira_agenda_sequencias_campanhas.sql`
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — `mandarParaLixeira` cancela as
  execuções `em_andamento` do contato.
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — `buscarContatosParaFollowUp` e
  `criarFollowUp` ignoram/recusam contato na lixeira.
- **Modificar:** `src/app/(auth)/sequencias/actions.ts` — `iniciarSequenciaManual` recusa
  contato na lixeira.
- **Modificar:** `src/lib/sequencias.ts` — `processarSequenciasPendentes` cancela, sem enviar,
  execução de contato na lixeira; `iniciarExecucaoSequencia` não inicia para contato na
  lixeira.
- **Modificar:** `src/lib/automacoes.ts` — `processarAutomacoes` sai cedo para contato na
  lixeira.
- **Modificar:** `src/lib/campanhas.ts` — `processarCampanha` marca `excluido` e pula o
  destinatário cujo contato está na lixeira.
- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `buscarDestinatariosSegmento`
  (contatos e reenvio) e `opcoesSegmentacao` ignoram contato na lixeira.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — "Excluído" em
  `STATUS_LABEL`/`STATUS_CLASS`.
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — compras só de contatos ativos.
- **Modificar:** `src/test/automacoes.test.ts` — o banco simulado passa a responder `rpc("contato_na_lixeira")` com `false` (3 mocks). Incluído na execução, com aprovação da Marcelle (02/10): sem isso as automações saíam cedo nos testes.

Reaproveita: a função `contato_na_lixeira` da B13-02; o formato de cancelamento de
`cancelarSequenciaRun`; o padrão de `motivo`/status do relatório.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Migration aplicada (regras de `reminders`/`sequence_runs`, status `excluido`)
- [x] Exclusão cancela as sequências em andamento do contato
- [x] Agenda: follow-up e busca ignoram/recusam contato na lixeira
- [x] Sequência manual e motor de sequências não agem em contato na lixeira
- [x] Automações não disparam para contato na lixeira
- [x] Campanhas: público, reenvio, opções e disparo ignoram contato na lixeira; relatório "Excluído"
- [x] Dashboard: compras de contato na lixeira não contam
- [x] Verificação no banco real (teste temporário): lembrete some e volta ao restaurar
      (simulado), sequência cancelada, cron não envia, campanha marca `excluido`, compra
      não conta — 4/4 com teste temporário (não versionado), empresa temporária apagada. O cron de sequências não foi chamado no teste (há 1 sequência real vencendo no banco e ele processa todas as empresas); o bloqueio dele foi conferido no código e pelo `iniciarExecucaoSequencia`
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`, testes existentes de agenda,
      sequências, campanhas, automações e dashboard passando — 83/83 depois do ajuste do mock de automações
