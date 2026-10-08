-- B11-13: as regras da primeira versão saem. Desde o deploy da parte 1, nenhum
-- código lê `automations` nem `automation_flows.automation_id`. Esta é a primeira
-- migration da B11 que apaga em vez de acrescentar, e só roda depois daquele
-- deploy: na ordem inversa, a produção leria uma tabela que não existe mais.
--
-- Em 08/10/2026, `automations` tinha uma linha só, a regra da empresa de teste,
-- e nenhuma regra em fluxo apontava para ela. Nada é copiado.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 16.

-- Primeiro a coluna: é a chave estrangeira que aponta para a tabela antiga
alter table public.automation_flows drop column automation_id;

-- As policies de `automations` saem junto com a tabela
drop table public.automations;
