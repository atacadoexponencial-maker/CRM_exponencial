-- B41-05: prazo de "parado" por etapa dos funis da empresa (SUP-B41-04). Vazio = sem
-- aviso. Com prazo, o card que passa desses dias na etapa aparece parado no quadro e
-- na Central de Alertas.

alter table public.funil_etapas
  add column if not exists parado_dias int,
  add constraint funil_etapas_parado_dias check (parado_dias is null or parado_dias between 1 and 365);
