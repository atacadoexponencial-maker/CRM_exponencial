-- B48-14: o fuso da empresa. As telas mostram as datas nele e o horário comercial
-- das automações é lido nele. Começa em Brasília; só os fusos do Brasil (decisão do
-- Luan em 28/10/2026). Quem troca é o Admin, pela action com a chave de serviço:
-- a tabela continua sem política de update.
--
-- Por que este arquivo chegou à master antes do resto da B48 (28/10/2026): ele foi
-- aplicado no banco de teste e na produção a partir do branch b46-correcoes-qa-ux.
-- Sem o arquivo na pasta, um `npm run db:teste:push` ou `supabase db push --linked`
-- feito da master para com "Remote migration versions not found in local migrations
-- directory": o banco tem uma versão que a pasta não tem. Não use `migration repair`
-- para apagá-la do histórico; a coluna existe nos dois bancos. O código que lê a
-- coluna (Configurações → Empresa, fusoDaEmpresa) chega com o merge da B48; até lá
-- ninguém lê nem grava `fuso`, e todas as empresas ficam em Brasília.
-- O número é 000002 porque a 20261028000001 já era da Marcelle
-- (canal_pessoal_so_conta_ativa); a nossa nasceu com o mesmo número e foi renomeada.
alter table public.workspaces
  add column if not exists fuso text not null default 'America/Sao_Paulo';

alter table public.workspaces
  drop constraint if exists workspaces_fuso_do_brasil;

alter table public.workspaces
  add constraint workspaces_fuso_do_brasil
  check (fuso in ('America/Noronha', 'America/Sao_Paulo', 'America/Cuiaba', 'America/Manaus', 'America/Rio_Branco'));
