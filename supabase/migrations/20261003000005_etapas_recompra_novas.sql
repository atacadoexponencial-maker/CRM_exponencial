-- B15-01, passo 2 de 2: as etapas do Funil de Recompra passam a ser onboarding, reposicao,
-- ativos, ativos_ri, inativos, inativos_rp e perdidos. recompra_realizada deixa de existir
-- e vira ativos. Aplicar SÓ depois que o código novo estiver no ar (o passo 1,
-- 20261003000004, já deixou a regra aceitando os dois conjuntos).
--
-- Só troca o valor: não mexe em etapa_changed_at, não grava histórico e não dispara nada.
-- "perdido" existe também no Funil de Entrada, então tudo filtra pelos cards da Recompra.
--
-- Volta atrás (numa transação; depois promover no Vercel o deploy anterior):
--   recolocar a regra do passo 1 (20261003000004) e rodar os updates abaixo ao contrário:
--   onboarding→em_onboarding, reposicao→aguardando_recompra, ativos→cliente_ativo,
--   ativos_ri→em_risco, inativos→inativo, inativos_rp→inativo, perdidos→perdido.
--   A distinção entre Cliente Ativo e Recompra Realizada não se recupera.

update public.pipeline_cards
  set etapa = case etapa
    when 'em_onboarding' then 'onboarding'
    when 'aguardando_recompra' then 'reposicao'
    when 'cliente_ativo' then 'ativos'
    when 'recompra_realizada' then 'ativos'
    when 'em_risco' then 'ativos_ri'
    when 'inativo' then 'inativos'
    when 'perdido' then 'perdidos' end
  where funil = 'recompra'
    and etapa in ('em_onboarding', 'aguardando_recompra', 'cliente_ativo', 'recompra_realizada', 'em_risco', 'inativo', 'perdido');

update public.pipeline_card_history
  set para_etapa = case para_etapa
    when 'em_onboarding' then 'onboarding'
    when 'aguardando_recompra' then 'reposicao'
    when 'cliente_ativo' then 'ativos'
    when 'recompra_realizada' then 'ativos'
    when 'em_risco' then 'ativos_ri'
    when 'inativo' then 'inativos'
    when 'perdido' then 'perdidos' end
  where para_etapa in ('em_onboarding', 'aguardando_recompra', 'cliente_ativo', 'recompra_realizada', 'em_risco', 'inativo', 'perdido')
    and card_id in (select id from public.pipeline_cards where funil = 'recompra');

update public.pipeline_card_history
  set de_etapa = case de_etapa
    when 'em_onboarding' then 'onboarding'
    when 'aguardando_recompra' then 'reposicao'
    when 'cliente_ativo' then 'ativos'
    when 'recompra_realizada' then 'ativos'
    when 'em_risco' then 'ativos_ri'
    when 'inativo' then 'inativos'
    when 'perdido' then 'perdidos' end
  where de_etapa in ('em_onboarding', 'aguardando_recompra', 'cliente_ativo', 'recompra_realizada', 'em_risco', 'inativo', 'perdido')
    and card_id in (select id from public.pipeline_cards where funil = 'recompra');

update public.automations
  set gatilho_config = jsonb_set(gatilho_config, '{etapa}', to_jsonb(case gatilho_config->>'etapa'
    when 'em_onboarding' then 'onboarding'
    when 'aguardando_recompra' then 'reposicao'
    when 'cliente_ativo' then 'ativos'
    when 'recompra_realizada' then 'ativos'
    when 'em_risco' then 'ativos_ri'
    when 'inativo' then 'inativos'
    when 'perdido' then 'perdidos' end))
  where gatilho_config->>'funil' = 'recompra'
    and gatilho_config->>'etapa' in ('em_onboarding', 'aguardando_recompra', 'cliente_ativo', 'recompra_realizada', 'em_risco', 'inativo', 'perdido');

update public.automations
  set acao_config = jsonb_set(acao_config, '{etapa}', to_jsonb(case acao_config->>'etapa'
    when 'em_onboarding' then 'onboarding'
    when 'aguardando_recompra' then 'reposicao'
    when 'cliente_ativo' then 'ativos'
    when 'recompra_realizada' then 'ativos'
    when 'em_risco' then 'ativos_ri'
    when 'inativo' then 'inativos'
    when 'perdido' then 'perdidos' end))
  where acao_config->>'funil' = 'recompra'
    and acao_config->>'etapa' in ('em_onboarding', 'aguardando_recompra', 'cliente_ativo', 'recompra_realizada', 'em_risco', 'inativo', 'perdido');

alter table public.pipeline_cards drop constraint pipeline_cards_etapa_check;
alter table public.pipeline_cards add constraint pipeline_cards_etapa_check check (
  etapa in (
    'lead', 'sondagem', 'catalogo_enviado', 'follow_catalogo', 'negociacao', 'nutricao', 'ganho', 'perdido',
    'onboarding', 'reposicao', 'ativos', 'ativos_ri', 'inativos', 'inativos_rp', 'perdidos'
  )
);
