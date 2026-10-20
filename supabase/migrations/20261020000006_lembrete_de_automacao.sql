-- B28-01: a ação "criar lembrete na Agenda" das automações.
--
-- O lembrete criado por automação ganha a origem 'automacao', ao lado de
-- 'sequencia' (as sequências saem na B28-06; as linhas antigas continuam
-- válidas até a B28-07) e 'avulso' (follow-up). A Agenda mostra de qual regra
-- ele veio: `automacao_nome` guarda uma cópia do nome, como o histórico das
-- execuções faz, para continuar legível depois que a regra muda ou é excluída.
--
-- Só acrescenta: a regra nova aceita tudo o que a antiga aceitava, então o
-- código que está no ar (sem a B28) continua funcionando.

alter table public.reminders drop constraint if exists reminders_origem_check;
alter table public.reminders
  add constraint reminders_origem_check check (origem in ('sequencia', 'avulso', 'automacao'));

alter table public.reminders add column if not exists automacao_nome text;
