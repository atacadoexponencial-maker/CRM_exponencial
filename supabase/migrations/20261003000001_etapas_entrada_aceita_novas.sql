-- B14-01, passo 1 de 2: durante a troca das etapas do Funil de Entrada, a regra aceita
-- os valores antigos (em_qualificacao, em_negociacao, primeira_compra) e os novos
-- (sondagem, negociacao, ganho). Assim o código no ar e o código novo funcionam
-- enquanto o deploy acontece. O passo 2 (20261003000002) converte os dados e deixa só
-- os valores novos.

alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (
  etapa in (
    'lead', 'em_qualificacao', 'sondagem', 'catalogo_enviado', 'em_negociacao', 'negociacao',
    'primeira_compra', 'ganho',
    'em_onboarding', 'cliente_ativo', 'aguardando_recompra', 'recompra_realizada', 'em_risco', 'inativo', 'perdido'
  )
);
