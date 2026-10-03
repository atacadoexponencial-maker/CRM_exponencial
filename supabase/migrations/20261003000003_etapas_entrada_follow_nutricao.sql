-- B14-02: o Funil de Entrada ganha as etapas follow_catalogo e nutricao. A regra só
-- acrescenta valores (perdido já era aceito por causa da Recompra), então pode ser
-- aplicada antes do deploy sem afetar o código no ar. Nenhum dado muda.
--
-- Volta atrás: promover no Vercel o deploy anterior e mover para outra etapa os cards do
-- Funil de Entrada em follow_catalogo, nutricao ou perdido. A regra pode ficar.

alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (
  etapa in (
    'lead', 'sondagem', 'catalogo_enviado', 'follow_catalogo', 'negociacao', 'nutricao', 'ganho',
    'em_onboarding', 'cliente_ativo', 'aguardando_recompra', 'recompra_realizada', 'em_risco', 'inativo', 'perdido'
  )
);
