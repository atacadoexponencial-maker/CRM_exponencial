-- B14-01, passo 2 de 2: as etapas do Funil de Entrada em_qualificacao, em_negociacao e
-- primeira_compra passam a se chamar sondagem, negociacao e ganho.
-- Aplicar SÓ depois que o código novo estiver no ar (o passo 1, 20261003000001,
-- já deixou a regra aceitando os dois conjuntos de valores).
--
-- Só troca o valor: não mexe em etapa_changed_at (o tempo na etapa continua o mesmo),
-- não grava histórico novo e não dispara nada (SQL direto, fora do moverCard).
-- Os valores antigos só existem no Funil de Entrada, então a troca no histórico é por valor.
--
-- Volta atrás (rodar numa transação e promover no Vercel o deploy anterior):
--   alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
--   alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (etapa in (
--     'lead', 'em_qualificacao', 'sondagem', 'catalogo_enviado', 'em_negociacao', 'negociacao',
--     'primeira_compra', 'ganho', 'em_onboarding', 'cliente_ativo', 'aguardando_recompra',
--     'recompra_realizada', 'em_risco', 'inativo', 'perdido'));
--   update public.pipeline_cards set etapa = case etapa when 'sondagem' then 'em_qualificacao'
--     when 'negociacao' then 'em_negociacao' else 'primeira_compra' end
--     where funil = 'entrada' and etapa in ('sondagem', 'negociacao', 'ganho');
--   update public.pipeline_card_history set para_etapa = case para_etapa when 'sondagem' then 'em_qualificacao'
--     when 'negociacao' then 'em_negociacao' else 'primeira_compra' end
--     where para_etapa in ('sondagem', 'negociacao', 'ganho');
--   update public.pipeline_card_history set de_etapa = case de_etapa when 'sondagem' then 'em_qualificacao'
--     when 'negociacao' then 'em_negociacao' else 'primeira_compra' end
--     where de_etapa in ('sondagem', 'negociacao', 'ganho');
--   (automações: o mesmo jsonb_set abaixo, com os valores trocados)

update public.pipeline_cards
  set etapa = case etapa
    when 'em_qualificacao' then 'sondagem'
    when 'em_negociacao' then 'negociacao'
    else 'ganho' end
  where funil = 'entrada' and etapa in ('em_qualificacao', 'em_negociacao', 'primeira_compra');

update public.pipeline_card_history
  set para_etapa = case para_etapa
    when 'em_qualificacao' then 'sondagem'
    when 'em_negociacao' then 'negociacao'
    else 'ganho' end
  where para_etapa in ('em_qualificacao', 'em_negociacao', 'primeira_compra');

update public.pipeline_card_history
  set de_etapa = case de_etapa
    when 'em_qualificacao' then 'sondagem'
    when 'em_negociacao' then 'negociacao'
    else 'ganho' end
  where de_etapa in ('em_qualificacao', 'em_negociacao', 'primeira_compra');

update public.automations
  set gatilho_config = jsonb_set(gatilho_config, '{etapa}', to_jsonb(case gatilho_config->>'etapa'
    when 'em_qualificacao' then 'sondagem'
    when 'em_negociacao' then 'negociacao'
    else 'ganho' end))
  where gatilho_config->>'funil' = 'entrada'
    and gatilho_config->>'etapa' in ('em_qualificacao', 'em_negociacao', 'primeira_compra');

update public.automations
  set acao_config = jsonb_set(acao_config, '{etapa}', to_jsonb(case acao_config->>'etapa'
    when 'em_qualificacao' then 'sondagem'
    when 'em_negociacao' then 'negociacao'
    else 'ganho' end))
  where acao_config->>'funil' = 'entrada'
    and acao_config->>'etapa' in ('em_qualificacao', 'em_negociacao', 'primeira_compra');

alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (
  etapa in (
    'lead', 'sondagem', 'catalogo_enviado', 'negociacao', 'ganho',
    'em_onboarding', 'cliente_ativo', 'aguardando_recompra', 'recompra_realizada', 'em_risco', 'inativo', 'perdido'
  )
);
