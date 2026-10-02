-- B12-04, passo 2 de 2: os funis passam a se chamar entrada e recompra.
-- Aplicar SÓ depois que o código novo estiver no ar (o passo 1, 20261002000002,
-- já deixou a regra aceitando os dois pares de valores).
--
-- Volta atrás (rodar numa transação e promover no Vercel o deploy anterior):
--   alter table public.pipeline_cards drop constraint pipeline_cards_funil_check;
--   alter table public.pipeline_cards add constraint pipeline_cards_funil_check
--     check (funil in ('expansao', 'retencao', 'entrada', 'recompra'));
--   update public.pipeline_cards set funil = 'expansao' where funil = 'entrada';
--   update public.pipeline_cards set funil = 'retencao' where funil = 'recompra';
--   update public.automations set gatilho_config = jsonb_set(gatilho_config, '{funil}',
--     to_jsonb(case gatilho_config->>'funil' when 'entrada' then 'expansao' else 'retencao' end))
--     where gatilho_config->>'funil' in ('entrada', 'recompra');
--   update public.automations set acao_config = jsonb_set(acao_config, '{funil}',
--     to_jsonb(case acao_config->>'funil' when 'entrada' then 'expansao' else 'retencao' end))
--     where acao_config->>'funil' in ('entrada', 'recompra');
--   alter table public.pipeline_cards alter column funil set default 'expansao';

update public.pipeline_cards set funil = 'entrada'  where funil = 'expansao';
update public.pipeline_cards set funil = 'recompra' where funil = 'retencao';

update public.automations
  set gatilho_config = jsonb_set(gatilho_config, '{funil}',
    to_jsonb(case gatilho_config->>'funil' when 'expansao' then 'entrada' else 'recompra' end))
  where gatilho_config->>'funil' in ('expansao', 'retencao');

update public.automations
  set acao_config = jsonb_set(acao_config, '{funil}',
    to_jsonb(case acao_config->>'funil' when 'expansao' then 'entrada' else 'recompra' end))
  where acao_config->>'funil' in ('expansao', 'retencao');

alter table public.pipeline_cards alter column funil set default 'entrada';

alter table public.pipeline_cards drop constraint pipeline_cards_funil_check;
alter table public.pipeline_cards add constraint pipeline_cards_funil_check
  check (funil in ('entrada', 'recompra'));
