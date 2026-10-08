-- B11-10: a versão em fluxo guarda qual regra antiga ela substitui.
-- Só acrescenta uma coluna à tabela nova da B11-02, que o CRM publicado não lê.
--
-- No branch b11-automacoes-v2, o motor não roda uma regra de `automations` que já
-- tem versão aqui. Na limpeza depois do merge, as regras antigas com versão nova
-- são descartadas, e as sem versão nova são copiadas.
-- Se a produção apagar a regra antiga, a versão nova fica (set null).

alter table public.automation_flows
  add column automation_id uuid unique references public.automations(id) on delete set null;
