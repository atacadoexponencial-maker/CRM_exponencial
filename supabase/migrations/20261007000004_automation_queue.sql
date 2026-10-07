-- B11-09: fila das automações. O ponto de disparo (webhook, gateway, actions do
-- CRM) só grava o evento aqui e responde; logo depois da resposta, o CRM consome
-- a fila e roda as regras (src/lib/automacoes/fila.ts). Só cria tabela e função
-- novas: o CRM publicado não as usa e não percebe nada.
--
-- Os eventos de uma mesma chave (o contato, ou a empresa quando o evento não tem
-- contato) rodam um de cada vez, na ordem em que chegaram. Sem isso, três
-- mensagens seguidas do cliente rodariam juntas, nenhuma enxergaria a outra na
-- proteção de repetição, e a resposta automática sairia três vezes.
--
-- O evento que terminou é apagado: o histórico fica em automation_runs.
-- Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 11.

create table public.automation_queue (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- O contato do evento, ou a empresa quando ele não tem contato
  chave text not null,
  -- O GatilhoAutomacao de src/lib/automacoes/contexto.ts
  evento jsonb not null check (jsonb_typeof(evento) = 'object'),
  status text not null default 'pendente' check (status in ('pendente', 'processando', 'descartado')),
  -- Por que foi descartado
  motivo text,
  created_at timestamptz not null default now(),
  iniciado_em timestamptz
);

create index automation_queue_chave_na_fila
  on public.automation_queue (chave, created_at)
  where status in ('pendente', 'processando');

-- Sem política: só o service client (que passa por cima da RLS) lê e grava.
alter table public.automation_queue enable row level security;

-- Entrega o próximo evento pendente da chave, já marcado como "processando", ou
-- nada quando outro evento da chave está rodando. A trava por chave faz duas
-- chamadas ao mesmo tempo esperarem uma pela outra: a segunda já enxerga o que
-- a primeira marcou.
--
-- No máximo uma vez: evento "processando" há mais de 5 minutos (o tempo máximo
-- da função na Vercel) é descartado, e não repetido, porque repetir poderia
-- mandar a mesma mensagem duas vezes. Evento pendente há mais de 10 minutos
-- também é descartado, para a regra não responder fora de hora.
create function public.reivindicar_evento_de_automacao(p_chave text)
returns setof public.automation_queue
language plpgsql
set search_path = public
as $$
declare
  proximo public.automation_queue;
begin
  perform pg_advisory_xact_lock(hashtext('automation_queue:' || p_chave));

  update public.automation_queue
     set status = 'descartado', motivo = 'Interrompido: a função terminou antes de acabar'
   where chave = p_chave and status = 'processando' and iniciado_em < now() - interval '5 minutes';

  update public.automation_queue
     set status = 'descartado', motivo = 'Esperou demais na fila'
   where chave = p_chave and status = 'pendente' and created_at < now() - interval '10 minutes';

  if exists (select 1 from public.automation_queue where chave = p_chave and status = 'processando') then
    return;
  end if;

  update public.automation_queue
     set status = 'processando', iniciado_em = now()
   where id = (
     select id
       from public.automation_queue
      where chave = p_chave and status = 'pendente'
      order by created_at, id
      limit 1
   )
  returning * into proximo;

  if proximo.id is not null then
    return next proximo;
  end if;
end;
$$;

revoke execute on function public.reivindicar_evento_de_automacao(text) from public, anon, authenticated;
grant execute on function public.reivindicar_evento_de_automacao(text) to service_role;
