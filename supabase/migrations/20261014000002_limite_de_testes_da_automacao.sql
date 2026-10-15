-- B22-29: o contador de tentativas (B20-05) passa a contar também o "Testar com um
-- contato" das automações, para o limite de 10 testes por minuto por pessoa (achado
-- M20 do QA das automações, 09/10/2026; limite decidido pelo Luan em 14/10/2026).
-- Troca a regra de tipos do contador, como a B21-07: aplicada no merge do lote 4.
-- Antes dela, o registro do teste falha em silêncio e ninguém é bloqueado.
alter table public.tentativas_de_acesso drop constraint if exists tentativas_de_acesso_tipo_check;
alter table public.tentativas_de_acesso
  add constraint tentativas_de_acesso_tipo_check check (tipo in ('cadastro', 'login', 'pedido_loja', 'teste_automacao'));
