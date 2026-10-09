-- B21-07: o contador de tentativas (B20-05) passa a contar também os pedidos da loja,
-- para o limite de 10 pedidos por hora por endereço de internet, por loja.
alter table public.tentativas_de_acesso drop constraint if exists tentativas_de_acesso_tipo_check;
alter table public.tentativas_de_acesso
  add constraint tentativas_de_acesso_tipo_check check (tipo in ('cadastro', 'login', 'pedido_loja'));
