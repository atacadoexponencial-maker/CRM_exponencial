-- B7-01: a conversa passa a saber por qual número ela acontece.
--
-- Enquanto existia um canal só, "o número do workspace" bastava. Com dois
-- canais coexistindo por número, responder pela primeira conexão conectada é
-- sorteio: a conversa que chegou pelo número do gateway seria respondida pelo
-- número da Meta, e o cliente receberia resposta de outro telefone.
--
-- A coluna é anulável de propósito: conversa antiga de workspace que teve a
-- conexão removida não tem resposta certa, e o envio cai no caminho antigo (o
-- número conectado do workspace) em vez de falhar.

alter table conversations
  add column whatsapp_connection_id uuid references whatsapp_connections(id);

-- Preenchimento das conversas que já existem: até esta migration todo workspace
-- tinha no máximo uma conexão, e ela é da Meta. Onde houver mais de uma, a mais
-- antiga é a que originou as conversas antigas.
update conversations c
   set whatsapp_connection_id = (
     select w.id
       from whatsapp_connections w
      where w.workspace_id = c.workspace_id
      order by w.created_at asc
      limit 1
   )
 where c.whatsapp_connection_id is null;

create index conversations_whatsapp_connection_idx
  on conversations (whatsapp_connection_id);

comment on column conversations.whatsapp_connection_id is
  'Número por onde a conversa acontece (B7-01). Nulo: cai no número do workspace.';
