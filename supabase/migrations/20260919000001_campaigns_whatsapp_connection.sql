-- B7-03: a campanha passa a guardar por qual número ela dispara.
--
-- Com dois canais, essa é a escolha mais importante de uma campanha: define o
-- risco de banimento (o canal direto opera fora dos Termos do WhatsApp) e a
-- velocidade do disparo (o gateway respeita ritmo, tetos e janela de envio).
--
-- Anulável e sem preenchimento retroativo: campanha antiga disparava pelo
-- número conectado do workspace, e continua assim. Preencher com a conexão
-- atual seria inventar uma decisão que ninguém tomou.

alter table campaigns
  add column whatsapp_connection_id uuid references whatsapp_connections(id);

comment on column campaigns.whatsapp_connection_id is
  'Número de origem do disparo (B7-03). Nulo: cai no número conectado do workspace.';
