-- B36-04: bloco "Esperando resposta" do Dashboard.
-- Conversas abertas (não resolvidas) em que a última mensagem, fora notas internas e
-- mensagens apagadas, veio do cliente. A mais antiga primeiro.
--
-- security invoker: roda com a permissão de quem chama, então a RLS de conversas e
-- mensagens vale como no Chat (o Atendente só vê as dele, B21-01).

create or replace function public.conversas_esperando_resposta(p_limite int default 50)
returns table (
  conversa_id uuid,
  contato_id uuid,
  contato_nome text,
  telefone text,
  trecho text,
  tipo text,
  desde timestamptz,
  funil text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.contact_id,
    ct.name,
    ct.phone_number,
    m.content,
    m.type,
    m.created_at,
    (select pc.funil from pipeline_cards pc where pc.contact_id = c.contact_id order by pc.created_at desc limit 1)
  from conversations c
  join contacts ct on ct.id = c.contact_id and ct.excluido_em is null
  join lateral (
    select mm.direction, mm.content, mm.type, mm.created_at
    from messages mm
    where mm.conversation_id = c.id
      and mm.deleted_at is null
      and mm.type <> 'nota_interna'
    order by mm.created_at desc
    limit 1
  ) m on true
  where c.status <> 'resolvida'
    and m.direction = 'recebida'
  order by m.created_at asc
  limit greatest(1, least(coalesce(p_limite, 50), 200));
$$;

grant execute on function public.conversas_esperando_resposta(int) to authenticated;
