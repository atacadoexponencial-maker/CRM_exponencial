-- B8-02: destinatário aceito pelo gateway e ainda esperando a vez de sair.
--
-- Pelo canal direto não existe envio imediato: a resposta do gateway significa
-- *aceita*, não *enviada*, e a confirmação real chega depois, no evento
-- `message.status` com `sent`. Sem um estado próprio, os dois momentos ficavam
-- registrados como `enviado`, e o acompanhamento não conseguia dizer quanto já
-- saiu de verdade.
--
-- Pela API Oficial nada muda: lá a resposta já é o envio, e o destinatário
-- continua indo direto para `enviado`.

alter table campaign_recipients
  drop constraint campaign_recipients_status_check;

alter table campaign_recipients
  add constraint campaign_recipients_status_check
    check (status in ('pendente', 'na_fila', 'enviado', 'entregue', 'lido', 'falhou'));

comment on column campaign_recipients.status is
  'pendente → na_fila (aceita pelo gateway, B8-02) → enviado → entregue → lido; falhou em qualquer ponto.';
