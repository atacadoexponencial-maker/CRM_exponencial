-- B22-30: só o admin lê as regras de automação (achado M21 do QA das automações,
-- 09/10/2026; decidido pelo Luan em 14/10/2026). A spec diz que só o admin vê as
-- automações, mas a política "membros leem" (copiada das regras da primeira
-- versão) deixava gerente e atendente lerem todas as regras, com os textos das
-- mensagens e os links dos arquivos, direto pela API do Supabase.
--
-- O admin continua lendo pela política "Admin gerencia…", que vale para tudo. O
-- motor e o histórico usam a chave de serviço; as telas de automação são só do admin.
-- O histórico (`automation_runs`) já era só do admin.
--
-- Tira uma política que existe: aplicada no merge do lote 4.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 32.

drop policy if exists "Membros veem fluxos de automação do próprio workspace" on public.automation_flows;
