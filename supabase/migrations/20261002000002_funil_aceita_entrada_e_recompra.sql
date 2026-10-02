-- B12-04, passo 1 de 2: durante a troca de nomes dos funis, a regra aceita os
-- valores antigos (expansao/retencao) e os novos (entrada/recompra). Assim o
-- código no ar e o código novo funcionam enquanto o deploy acontece.
-- O passo 2 (20261002000003) converte os dados e deixa só os valores novos.

alter table public.pipeline_cards drop constraint pipeline_cards_funil_check;
alter table public.pipeline_cards add constraint pipeline_cards_funil_check
  check (funil in ('expansao', 'retencao', 'entrada', 'recompra'));
