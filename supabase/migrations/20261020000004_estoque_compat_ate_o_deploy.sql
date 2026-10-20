-- A migration 20261020000003 apagou a assinatura antiga de salvar_estoque_produto
-- (3 argumentos) antes de o código novo ir ao ar; a produção chama a antiga e salvar
-- produto quebraria até o deploy. Esta assinatura devolve a antiga, por cima da nova:
-- a grade recebida é a lista de combinações e o estoque ao mesmo tempo, como era.
-- Pode ser apagada depois que o código de 20/10/2026 estiver em produção.
create or replace function public.salvar_estoque_produto(p_produto uuid, p_tipos jsonb, p_estoque jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  select public.salvar_estoque_produto(
    p_produto,
    p_tipos,
    p_estoque,
    coalesce((select jsonb_agg(k) from jsonb_object_keys(p_estoque) as k), '[]'::jsonb)
  );
$$;
