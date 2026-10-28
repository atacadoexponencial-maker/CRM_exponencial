-- B48-14: o fuso da empresa. As telas mostram as datas nele e o horário comercial
-- das automações é lido nele. Começa em Brasília; só os fusos do Brasil (decisão do
-- Luan em 28/10/2026). Quem troca é o Admin, pela action com a chave de serviço:
-- a tabela continua sem política de update.
alter table public.workspaces
  add column if not exists fuso text not null default 'America/Sao_Paulo';

alter table public.workspaces
  drop constraint if exists workspaces_fuso_do_brasil;

alter table public.workspaces
  add constraint workspaces_fuso_do_brasil
  check (fuso in ('America/Noronha', 'America/Sao_Paulo', 'America/Cuiaba', 'America/Manaus', 'America/Rio_Branco'));
