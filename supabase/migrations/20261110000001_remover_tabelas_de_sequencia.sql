-- B28-07: as tabelas de sequência saem do banco. Desde a B28-06 (no ar em 25/10/2026),
-- nenhum código cria nem roda sequência; este deploy tira as últimas leituras (a lista
-- do editor de automações e a conferência das referências). Como na B11-13, a migration
-- só roda depois desse código no ar: na ordem inversa, a produção leria uma tabela que
-- não existe mais.
--
-- Em 10/11/2026, na produção: 44 sequências, todas as 4 prontas que cada empresa ganhava
-- ao nascer (11 empresas, quase todas de teste), nenhuma criada por alguém; 99 passos;
-- 2 execuções, as duas canceladas; nenhum lembrete ligado a execução nem com origem
-- "sequencia"; nenhuma automação com o bloco "iniciar sequência". Nada é copiado.
-- Spec: pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md (CA-B28-36).

-- O lembrete deixa de apontar para a execução: o gatilho que conferia a empresa da
-- execução volta a olhar só atendente e contato
drop trigger if exists garantir_mesma_empresa on public.reminders;
create trigger garantir_mesma_empresa
  before insert or update of atendente_id, contact_id, workspace_id on public.reminders
  for each row execute function public.garantir_mesma_empresa('atendente_id:profiles', 'contact_id:contacts');

alter table public.reminders drop column sequence_run_id;

-- Sem sequência, o lembrete só nasce avulso ou de automação
alter table public.reminders drop constraint if exists reminders_origem_check;
alter table public.reminders
  add constraint reminders_origem_check check (origem in ('avulso', 'automacao'));

drop function if exists public.salvar_sequencia(uuid, text, text, jsonb);

-- As policies e os gatilhos de cada tabela saem junto com ela
drop table public.sequence_runs;
drop table public.sequence_steps;
drop table public.sequences;
