-- Número dos pedidos digitado pela pessoa, não mais uma conexão do CRM. A loja saía do ar
-- quando o número escolhido era removido em Configurações › WhatsApp, e não voltava nem
-- com o mesmo chip conectado de novo (vira conexão nova). O pedido só abre o WhatsApp da
-- cliente com esse telefone: não precisa de conexão nenhuma.
--
-- whatsapp_connection_id fica sem uso (o código em produção ainda o grava até o deploy);
-- sai numa limpeza depois.

alter table public.catalog_settings
  add column orders_whatsapp text check (orders_whatsapp is null or orders_whatsapp ~ '^55\d{10,11}$');

-- Lojas que já existem passam a usar o telefone da conexão que tinham, removida ou não.
update public.catalog_settings s
set orders_whatsapp = case
  when length(d.digitos) in (10, 11) then '55' || d.digitos
  else d.digitos
end
from (
  select c.id, regexp_replace(coalesce(c.phone_number, ''), '\D', '', 'g') as digitos
  from public.whatsapp_connections c
) d
where d.id = s.whatsapp_connection_id
  and (d.digitos ~ '^55\d{10,11}$' or length(d.digitos) in (10, 11));

-- A regra antiga (publicada exige conexão) foi criada sem nome: acha pela definição.
do $$
declare
  nome text;
begin
  select conname into nome
  from pg_constraint
  where conrelid = 'public.catalog_settings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%published%whatsapp_connection_id%';
  if nome is not null then
    execute format('alter table public.catalog_settings drop constraint %I', nome);
  end if;
end $$;

alter table public.catalog_settings
  add constraint catalog_settings_publicada_exige_numero
  check (not published or (slug is not null and orders_whatsapp is not null));
