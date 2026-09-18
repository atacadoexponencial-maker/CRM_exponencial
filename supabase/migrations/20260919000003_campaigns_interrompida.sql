-- B8-03: campanha interrompida, que é diferente de cancelada.
--
-- `cancelada` é ponto final. Num disparo de horas pelo canal direto, parar no
-- meio é operação rotineira: o texto saiu errado, as respostas vieram ruins, ou
-- o gateway freou o número. Nenhum desses casos deveria custar a campanha
-- inteira — o que já saiu permanece, e o resto continua depois.

alter table campaigns
  drop constraint campaigns_status_check;

alter table campaigns
  add constraint campaigns_status_check
    check (status in ('rascunho', 'agendada', 'enviando', 'interrompida', 'enviada', 'cancelada'));

alter table campaigns
  -- Por que parou: texto livre curto, escrito pelo CRM. Nas paradas
  -- automáticas guarda o motivo do freio vindo do gateway (`banned`,
  -- `failure_rate`, `manual`).
  add column interrompida_motivo text,
  add column interrompida_em timestamptz;

comment on column campaigns.interrompida_motivo is
  'Por que o disparo parou (B8-03). Nulo quando a campanha nunca foi interrompida.';
