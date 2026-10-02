-- B12-03: times padrão passam de "Expansão"/"Retenção" para "Entrada"/"Recompra".
-- Só dados; mesmo id e mesmos membros. Times customizados (is_default = false) não mudam.
--
-- Volta atrás:
--   update public.teams set name = 'Expansão' where is_default and name = 'Entrada';
--   update public.teams set name = 'Retenção' where is_default and name = 'Recompra';

update public.teams set name = 'Entrada'  where is_default and name = 'Expansão';
update public.teams set name = 'Recompra' where is_default and name = 'Retenção';
