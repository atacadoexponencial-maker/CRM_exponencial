-- B13-04: "Apagar de vez" um contato que está na lixeira. Usada pela página da
-- lixeira e, na B13-06, pela limpeza automática dos 30 dias.
--
-- Uma chamada de função é uma transação: ou some tudo, ou nada. Os arquivos de
-- mídia no Storage são apagados antes, pelo servidor (o banco não alcança o bucket).
-- Só o papel de serviço executa: a checagem de quem pode apagar fica no servidor.
--
-- Volta atrás: drop function public.apagar_contato_de_vez(uuid);

create or replace function public.apagar_contato_de_vez(p_contact_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from contacts where id = p_contact_id and excluido_em is not null) then
    return false;
  end if;

  -- Chaves sem cascata: mensagens → conversas → cards → contato.
  delete from messages
    where conversation_id in (select id from conversations where contact_id = p_contact_id);
  delete from conversations where contact_id = p_contact_id;
  -- Histórico, notas, etiquetas e alertas dispensados do card vão em cascata.
  delete from pipeline_cards where contact_id = p_contact_id;
  -- Lembretes, execuções de sequência, tags e compras vão em cascata; destinatários
  -- de campanha ficam com contact_id nulo (o relatório usa o instantâneo).
  delete from contacts where id = p_contact_id;
  return true;
end;
$$;

revoke all on function public.apagar_contato_de_vez(uuid) from public, anon, authenticated;
grant execute on function public.apagar_contato_de_vez(uuid) to service_role;
