-- B44-05: cada destinatário de campanha sai uma vez só (auditoria de 27/10/2026).
--
-- O motor lia os pendentes e só mudava o status depois de enviar. Duas execuções
-- ao mesmo tempo (o envio automático e o "Retomar", por exemplo) liam os mesmos
-- pendentes e mandavam a mesma mensagem duas vezes. Agora o motor reserva o
-- destinatário antes de enviar: só grava a reserva quem a encontra livre, e só
-- quem a gravou envia. Reserva com mais de 10 minutos é de execução que caiu.

alter table public.campaign_recipients
  add column reservado_em timestamptz;

comment on column public.campaign_recipients.reservado_em is
  'Quando uma execução do motor reservou o destinatário para enviar (B44-05). Vence em 10 minutos.';
