-- B44-09: os limites da loja valem mesmo com pedidos ao mesmo tempo (auditoria de
-- 27/10/2026).
--
-- O servidor contava as tentativas, fazia o pedido e só depois gravava a tentativa.
-- Quinze pedidos simultâneos liam a mesma contagem e passavam todos. Agora a vaga é
-- reservada numa operação só: trava pela chave, conta na janela e grava se couber.

alter table public.tentativas_de_acesso drop constraint if exists tentativas_de_acesso_tipo_check;
alter table public.tentativas_de_acesso
  add constraint tentativas_de_acesso_tipo_check
  check (tipo in ('cadastro', 'login', 'pedido_loja', 'teste_automacao', 'pedido_telefone'));

create or replace function public.reservar_tentativa(
  p_tipo text,
  p_chave text,
  p_limite integer,
  p_janela_minutos integer
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  -- Quem chega junto com a mesma chave espera aqui até o outro terminar.
  perform pg_advisory_xact_lock(hashtextextended(p_tipo || ':' || p_chave, 0));

  if (
    select count(*) from tentativas_de_acesso
     where tipo = p_tipo
       and chave = p_chave
       and criado_em >= now() - make_interval(mins => p_janela_minutos)
  ) >= p_limite then
    return null;
  end if;

  insert into tentativas_de_acesso (tipo, chave) values (p_tipo, p_chave) returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.reservar_tentativa(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.reservar_tentativa(text, text, integer, integer) to service_role;
