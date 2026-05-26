alter table pipeline_cards
  add column funil text not null default 'expansao'
    check (funil in ('expansao', 'retencao'));

alter table pipeline_cards
  drop constraint pipeline_cards_etapa_check;

alter table pipeline_cards
  add constraint pipeline_cards_etapa_check check (
    etapa in (
      'lead', 'em_qualificacao', 'catalogo_enviado', 'em_negociacao', 'primeira_compra',
      'em_onboarding', 'cliente_ativo', 'aguardando_recompra', 'recompra_realizada', 'em_risco', 'inativo', 'perdido'
    )
  );
