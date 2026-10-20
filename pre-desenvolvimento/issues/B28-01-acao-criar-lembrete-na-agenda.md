# B28-01: Ação "criar lembrete na Agenda" e teste da Agenda

**Tipo:** Implementação
**Página:** Automações (editor e motor) e Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

A automação ganha a ação "Criar lembrete na Agenda", que substitui a etapa de lembrete das
sequências: texto com variáveis, para quem (o responsável pela conversa, que é o padrão, ou
uma pessoa escolhida) e vencimento (na hora, ou depois de N horas ou dias). Junto, um
roteiro do preview passa pela Agenda inteira, que é o teste da "área de tarefas" que o Luan
pediu.

## Pronto quando

No preview, uma regra com a ação cria o lembrete na Agenda do responsável, marcado como
"Lembrete de automação" com o nome da regra; ele se marca, adia e reatribui como os
avulsos. O roteiro da Agenda passa inteiro.

## Critérios de aceite

- **CA-B28-27** (automática) — A ação cria o lembrete na Agenda do responsável. Dado um contato com conversa atribuída à Ana, e uma regra com "criar lembrete na Agenda" (texto "Ligar para {{nome_contato}}", para o responsável, vence em 2 dias), quando a regra roda, então a Agenda da Ana mostra "Ligar para Bruno", vencendo daqui a 2 dias, marcado como "Lembrete de automação".
- **CA-B28-28** (automática) — Sem responsável, o lembrete vai para o primeiro admin ativo. Dado um contato sem conversa atribuída, quando a regra com "para o responsável" roda, então o lembrete vai para o primeiro admin ativo da empresa.
- **CA-B28-29** (automática) — Pessoa escolhida desativada faz a ação falhar com o motivo. Dado uma regra com o lembrete para uma pessoa que foi desativada, quando a regra roda, então a ação falha e o histórico diz "a pessoa escolhida está desativada".
- **CA-B28-30** (automática) — O lembrete de automação se marca, adia e reatribui como os outros. Dado um lembrete criado por automação na Agenda, quando a pessoa marca feito, adia 1 dia ou o gerente reatribui, então a Agenda mostra o mesmo resultado que mostra para um lembrete avulso.
- **CA-B28-37** (automática) — Roteiro do preview passa pela Agenda inteira. Dado a empresa de teste no preview do branch, quando o roteiro roda, então passam: criar follow-up, vê-lo na Minha Agenda, marcar feito, adiar, atrasado com o selo no menu, Agenda da equipe com filtro por pessoa, reatribuir, e o lembrete criado pela automação.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-04 | A ação "criar lembrete na Agenda" tem as opções: texto com variáveis, para quem (responsável pela conversa ou pessoa escolhida) e vencimento (na hora, ou depois de N horas ou dias). Sem responsável, vai para o primeiro admin ativo, como a sequência fazia. | confirmada | Luan, 20/10/2026: o padrão do bloco é o responsável pela conversa, e dá para escolher outra pessoa. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-04 | O que é a "área de tarefas"? | respondida | A Agenda; a automação ganha "criar lembrete na Agenda" para substituir a etapa de lembrete das sequências (Luan, 20/10/2026). |
