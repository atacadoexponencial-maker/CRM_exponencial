-- B15-01, passo 1 de 2: durante a troca das etapas do Funil de Recompra, a regra aceita
-- os valores antigos (em_onboarding, cliente_ativo, aguardando_recompra,
-- recompra_realizada, em_risco, inativo, perdido) e os novos (onboarding, reposicao,
-- ativos, ativos_ri, inativos, inativos_rp, perdidos). O passo 2 (20261003000005)
-- converte os dados e deixa só os valores novos.

alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (
  etapa in (
    'lead', 'sondagem', 'catalogo_enviado', 'follow_catalogo', 'negociacao', 'nutricao', 'ganho', 'perdido',
    'em_onboarding', 'cliente_ativo', 'aguardando_recompra', 'recompra_realizada', 'em_risco', 'inativo',
    'onboarding', 'reposicao', 'ativos', 'ativos_ri', 'inativos', 'inativos_rp', 'perdidos'
  )
);
