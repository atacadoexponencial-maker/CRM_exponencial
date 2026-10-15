-- B22-26: um card por contato em cada funil (achado M6 do QA das automações,
-- 09/10/2026). Só acrescenta um índice único.
--
-- O "novo lead" não conferia se o contato já tinha card no Funil de Entrada, e um
-- contato com dois cards no mesmo funil quebrava "mover card" e a condição de etapa
-- das automações ("erro no banco"). A action passou a conferir; o índice segura
-- quem chegar junto e qualquer outro caminho.
--
-- Em 14/10/2026 a produção não tinha nenhum contato com dois cards no mesmo funil.
-- Aplicada no merge do lote 4 (decidido pelo Luan).
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 32.

create unique index if not exists pipeline_cards_um_por_funil
  on public.pipeline_cards (workspace_id, contact_id, funil);
