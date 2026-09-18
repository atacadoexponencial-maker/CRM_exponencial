-- B8-04: por que a mensagem não chegou.
--
-- Até aqui o motivo era perdido no caminho: o provider devolvia
-- `{ ok: false, motivo }`, o motor de campanhas descartava o motivo e gravava
-- só `falhou`. Quem lia o relatório via mil "falhou" iguais, sem saber se o
-- problema era o número do destinatário, o número de envio ou o arquivo — e
-- cada um pede uma reação diferente.

alter table campaign_recipients
  -- Texto já legível, gravado pelo CRM. Nunca o `error.code` cru do contrato:
  -- código não é para o operador ler.
  add column motivo text;

comment on column campaign_recipients.motivo is
  'Por que a mensagem não chegou, em português (B8-04). Nulo quando não houve falha.';
