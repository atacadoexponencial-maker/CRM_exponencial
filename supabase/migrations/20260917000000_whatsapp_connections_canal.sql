-- B1-02: uma conexão de WhatsApp passa a poder ser da API Oficial da Meta ou do
-- gateway próprio (canal direto, conexão por QR Code).
--
-- As linhas que já existem são todas da Meta: o default 'meta' as classifica
-- sem precisar de update.
--
-- As três colunas da Meta deixam de ser obrigatórias, porque um número do
-- gateway não tem WABA, nem phone_number_id, nem access_token. A garantia passa
-- a ser por canal, na constraint no fim do arquivo: cada canal exige o que faz
-- sentido para ele.

alter table whatsapp_connections
  add column canal text not null default 'meta',
  -- Identificador da instância no gateway. Ocupa, para o canal direto, o lugar
  -- que phone_number_id ocupa na Meta: é por ele que o evento recebido resolve
  -- o workspace (B6).
  add column instance_id text,
  -- Credencial da instância (X-Instance-Token). O gateway a devolve UMA vez, na
  -- criação, e não é recuperável depois. Nunca sai do backend.
  add column instance_token text,
  -- Motivo da última transição não solicitada: session_closed_on_device,
  -- banned_by_whatsapp, connection_lost (B2-04).
  add column state_reason text;

alter table whatsapp_connections
  alter column waba_id drop not null,
  alter column phone_number_id drop not null,
  alter column access_token drop not null,
  -- O número e o nome de exibição só são conhecidos depois de conectar pelo QR
  -- Code; na Meta eles vêm do OAuth, já preenchidos.
  alter column phone_number drop not null,
  alter column display_name drop not null;

alter table whatsapp_connections
  add constraint whatsapp_connections_canal_valido
    check (canal in ('meta', 'gateway'));

-- Duas conexões do mesmo número do gateway seriam duas sessões para o mesmo
-- aparelho: a segunda derrubaria a primeira.
create unique index whatsapp_connections_instance_id_idx
  on whatsapp_connections (instance_id)
  where instance_id is not null;

-- Cada canal exige o que precisa, e nada do outro:
--  - meta: WABA, phone_number_id e access_token;
--  - gateway: instance_id e instance_token.
alter table whatsapp_connections
  add constraint whatsapp_connections_credenciais_por_canal
    check (
      (canal = 'meta'
        and waba_id is not null
        and phone_number_id is not null
        and access_token is not null)
      or
      (canal = 'gateway'
        and instance_id is not null
        and instance_token is not null)
    );

comment on column whatsapp_connections.canal is
  'meta = API Oficial; gateway = canal direto por QR Code (B1-02)';
