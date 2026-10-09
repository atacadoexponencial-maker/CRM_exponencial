-- B21-04: nenhum registro de uma empresa aponta para algo de outra empresa.
--
-- As chaves estrangeiras só conferem que o registro apontado existe — não que é da mesma
-- empresa. Esta função confere, em toda gravação, que tudo o que a linha aponta é da
-- empresa dela. Vale para todos (inclusive service role): é invariante do dado, não
-- permissão de papel.
--
-- Verificação de 08/10/2026 nas 36 ligações abaixo: nenhum registro existente aponta
-- para outra empresa.
--
-- Argumentos da trigger: 'coluna:tabela_apontada'. A empresa de referência é a
-- workspace_id da própria linha; nas tabelas sem workspace_id, é a do primeiro registro
-- apontado (e os outros têm de bater com ela).

create or replace function public.garantir_mesma_empresa()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  linha jsonb := to_jsonb(new);
  empresa uuid := (linha ->> 'workspace_id')::uuid;
  empresa_apontada uuid;
  coluna text;
  tabela text;
  valor uuid;
  i int;
begin
  for i in 0 .. tg_nargs - 1 loop
    coluna := split_part(tg_argv[i], ':', 1);
    tabela := split_part(tg_argv[i], ':', 2);
    valor := (linha ->> coluna)::uuid;
    continue when valor is null;

    execute format('select workspace_id from public.%I where id = $1', tabela)
      into empresa_apontada
      using valor;
    -- Registro inexistente: a chave estrangeira recusa.
    continue when empresa_apontada is null;

    if empresa is null then
      empresa := empresa_apontada;
    elsif empresa_apontada <> empresa then
      raise exception 'Registro de outra empresa em %.%', tg_table_name, coluna
        using errcode = '42501';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists garantir_mesma_empresa on public.alert_dismissals;
create trigger garantir_mesma_empresa
  before insert or update of card_id, workspace_id on public.alert_dismissals
  for each row execute function public.garantir_mesma_empresa('card_id:pipeline_cards');

drop trigger if exists garantir_mesma_empresa on public.automation_runs;
create trigger garantir_mesma_empresa
  before insert or update of contact_id, workspace_id on public.automation_runs
  for each row execute function public.garantir_mesma_empresa('contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.campaign_recipients;
create trigger garantir_mesma_empresa
  before insert or update of campaign_id, contact_id, workspace_id on public.campaign_recipients
  for each row execute function public.garantir_mesma_empresa('campaign_id:campaigns', 'contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.campaigns;
create trigger garantir_mesma_empresa
  before insert or update of criado_por, whatsapp_connection_id, workspace_id on public.campaigns
  for each row execute function public.garantir_mesma_empresa('criado_por:profiles', 'whatsapp_connection_id:whatsapp_connections');

drop trigger if exists garantir_mesma_empresa on public.catalog_order_events;
create trigger garantir_mesma_empresa
  before insert or update of order_id, changed_by on public.catalog_order_events
  for each row execute function public.garantir_mesma_empresa('order_id:catalog_orders', 'changed_by:profiles');

drop trigger if exists garantir_mesma_empresa on public.catalog_order_items;
create trigger garantir_mesma_empresa
  before insert or update of order_id, product_id on public.catalog_order_items
  for each row execute function public.garantir_mesma_empresa('order_id:catalog_orders', 'product_id:catalog_products');

drop trigger if exists garantir_mesma_empresa on public.catalog_orders;
create trigger garantir_mesma_empresa
  before insert or update of contact_id, workspace_id on public.catalog_orders
  for each row execute function public.garantir_mesma_empresa('contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.catalog_products;
create trigger garantir_mesma_empresa
  before insert or update of category_id, workspace_id on public.catalog_products
  for each row execute function public.garantir_mesma_empresa('category_id:catalog_categories');

drop trigger if exists garantir_mesma_empresa on public.catalog_settings;
create trigger garantir_mesma_empresa
  before insert or update of whatsapp_connection_id, workspace_id on public.catalog_settings
  for each row execute function public.garantir_mesma_empresa('whatsapp_connection_id:whatsapp_connections');

drop trigger if exists garantir_mesma_empresa on public.catalog_stock;
create trigger garantir_mesma_empresa
  before insert or update of product_id, workspace_id on public.catalog_stock
  for each row execute function public.garantir_mesma_empresa('product_id:catalog_products');

drop trigger if exists garantir_mesma_empresa on public.contact_purchases;
create trigger garantir_mesma_empresa
  before insert or update of contact_id, workspace_id on public.contact_purchases
  for each row execute function public.garantir_mesma_empresa('contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.contact_tags;
create trigger garantir_mesma_empresa
  before insert or update of contact_id, workspace_id on public.contact_tags
  for each row execute function public.garantir_mesma_empresa('contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.contacts;
create trigger garantir_mesma_empresa
  before insert or update of atendente_id, excluido_por, workspace_id on public.contacts
  for each row execute function public.garantir_mesma_empresa('atendente_id:profiles', 'excluido_por:profiles');

drop trigger if exists garantir_mesma_empresa on public.conversation_labels;
create trigger garantir_mesma_empresa
  before insert or update of conversation_id, label_id on public.conversation_labels
  for each row execute function public.garantir_mesma_empresa('conversation_id:conversations', 'label_id:labels');

drop trigger if exists garantir_mesma_empresa on public.conversations;
create trigger garantir_mesma_empresa
  before insert or update of assigned_to, contact_id, whatsapp_connection_id, workspace_id on public.conversations
  for each row execute function public.garantir_mesma_empresa('assigned_to:profiles', 'contact_id:contacts', 'whatsapp_connection_id:whatsapp_connections');

drop trigger if exists garantir_mesma_empresa on public.messages;
create trigger garantir_mesma_empresa
  before insert or update of conversation_id, reply_to_id, workspace_id on public.messages
  for each row execute function public.garantir_mesma_empresa('conversation_id:conversations', 'reply_to_id:messages');

drop trigger if exists garantir_mesma_empresa on public.operational_alerts;
create trigger garantir_mesma_empresa
  before insert or update of connection_id, workspace_id on public.operational_alerts
  for each row execute function public.garantir_mesma_empresa('connection_id:whatsapp_connections');

drop trigger if exists garantir_mesma_empresa on public.pipeline_card_history;
create trigger garantir_mesma_empresa
  before insert or update of card_id, alterado_por on public.pipeline_card_history
  for each row execute function public.garantir_mesma_empresa('card_id:pipeline_cards', 'alterado_por:profiles');

drop trigger if exists garantir_mesma_empresa on public.pipeline_card_labels;
create trigger garantir_mesma_empresa
  before insert or update of card_id, label_id on public.pipeline_card_labels
  for each row execute function public.garantir_mesma_empresa('card_id:pipeline_cards', 'label_id:labels');

drop trigger if exists garantir_mesma_empresa on public.pipeline_card_notes;
create trigger garantir_mesma_empresa
  before insert or update of autor_id, card_id, workspace_id on public.pipeline_card_notes
  for each row execute function public.garantir_mesma_empresa('autor_id:profiles', 'card_id:pipeline_cards');

drop trigger if exists garantir_mesma_empresa on public.pipeline_cards;
create trigger garantir_mesma_empresa
  before insert or update of atendente_id, contact_id, workspace_id on public.pipeline_cards
  for each row execute function public.garantir_mesma_empresa('atendente_id:profiles', 'contact_id:contacts');

drop trigger if exists garantir_mesma_empresa on public.reminders;
create trigger garantir_mesma_empresa
  before insert or update of atendente_id, contact_id, sequence_run_id, workspace_id on public.reminders
  for each row execute function public.garantir_mesma_empresa('atendente_id:profiles', 'contact_id:contacts', 'sequence_run_id:sequence_runs');

drop trigger if exists garantir_mesma_empresa on public.sequence_runs;
create trigger garantir_mesma_empresa
  before insert or update of atendente_id, contact_id, sequence_id, workspace_id on public.sequence_runs
  for each row execute function public.garantir_mesma_empresa('atendente_id:profiles', 'contact_id:contacts', 'sequence_id:sequences');

drop trigger if exists garantir_mesma_empresa on public.user_teams;
create trigger garantir_mesma_empresa
  before insert or update of team_id, user_id on public.user_teams
  for each row execute function public.garantir_mesma_empresa('team_id:teams', 'user_id:profiles');
