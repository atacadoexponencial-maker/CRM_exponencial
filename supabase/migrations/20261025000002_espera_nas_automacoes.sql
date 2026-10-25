-- B28-02: o bloco "esperar" das automações.
--
-- Quando o caminho chega num bloco "esperar", a execução para ali e fica
-- guardada na própria linha do histórico, como 'esperando'. Ela continua do
-- mesmo ponto quando o relógio do motor a acorda (rota /api/automacoes/relogio,
-- chamada pelo gateway), e a mesma linha passa a 'concluida' ou 'falhou'.
-- Contato na lixeira tem as esperas 'cancelada's.
--
-- Só acrescenta: a regra nova do resultado aceita tudo o que a antiga aceitava,
-- e as colunas novas são nulas, então o código que está no ar (sem a B28)
-- continua funcionando.
-- Spec: pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md

alter table public.automation_runs drop constraint if exists automation_runs_resultado_check;
alter table public.automation_runs
  add constraint automation_runs_resultado_check
    check (resultado in ('concluida', 'falhou', 'ignorada', 'esperando', 'cancelada'));

-- O GatilhoAutomacao inteiro (src/lib/automacoes/contexto.ts): a execução segue
-- depois da espera com o mesmo evento. `evento` guarda só um trecho da mensagem.
alter table public.automation_runs add column if not exists gatilho jsonb;
-- Quando o relógio segue a espera. Nulo quando ela não espera tempo.
alter table public.automation_runs add column if not exists retomar_em timestamptz;
-- Quando o relógio pegou a espera para seguir; volta a nulo ao terminar.
alter table public.automation_runs add column if not exists retomada_em timestamptz;
-- A última vez que a execução mudou depois de gravada (seguiu ou foi cancelada).
alter table public.automation_runs add column if not exists atualizada_em timestamptz;

-- O relógio procura as esperas vencidas
create index if not exists automation_runs_esperas_vencidas
  on public.automation_runs (retomar_em)
  where resultado = 'esperando';

-- Contato esperando numa regra não a começa de novo (CA-B28-17)
create index if not exists automation_runs_esperando_na_regra
  on public.automation_runs (regra_id, contact_id)
  where resultado = 'esperando';

-- Entrega até `p_limite` esperas vencidas, já marcadas com `retomada_em`. Duas
-- chamadas ao mesmo tempo nunca recebem a mesma espera: a segunda pula as linhas
-- que a primeira travou (`skip locked`) e, depois que ela termina, não as vê mais
-- (`retomada_em` preenchido).
--
-- No máximo uma vez, como a fila (B11-09): a espera pega há mais de 5 minutos e
-- ainda não terminada é de uma função que a Vercel cortou. Ela vira 'falhou', e
-- não é repetida, porque repetir poderia mandar a mesma mensagem duas vezes.
--
-- `p_workspace_id` limita a uma empresa: o teste de integração usa para nunca
-- pegar a espera de um cliente (o banco é um só). O relógio não passa.
create or replace function public.reivindicar_esperas_vencidas(p_limite integer, p_workspace_id uuid default null)
returns setof public.automation_runs
language plpgsql
set search_path = public
as $$
begin
  update public.automation_runs
     set resultado = 'falhou',
         motivo = 'Interrompida: a função terminou antes de seguir a espera',
         retomar_em = null,
         retomada_em = null,
         atualizada_em = now()
   where resultado = 'esperando' and retomada_em < now() - interval '5 minutes'
     and (p_workspace_id is null or workspace_id = p_workspace_id);

  return query
  update public.automation_runs r
     set retomada_em = now()
   where r.id in (
     select v.id
       from public.automation_runs v
      where v.resultado = 'esperando' and v.retomada_em is null and v.retomar_em <= now()
        and (p_workspace_id is null or v.workspace_id = p_workspace_id)
      order by v.retomar_em
      limit greatest(p_limite, 0)
      for update skip locked
   )
  returning r.*;
end;
$$;

revoke execute on function public.reivindicar_esperas_vencidas(integer, uuid) from public, anon, authenticated;
grant execute on function public.reivindicar_esperas_vencidas(integer, uuid) to service_role;
