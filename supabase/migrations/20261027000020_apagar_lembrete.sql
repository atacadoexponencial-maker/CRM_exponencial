-- B46-06: o lembrete da Agenda pode ser apagado. Até aqui não havia política de
-- exclusão em reminders, e o RLS recusava todo delete. Vale para quem já pode
-- atualizar o lembrete: Admin e Gerente na empresa toda, o atendente nos dele.
-- Só acrescenta.
--
-- Volta atrás: drop policy "Exclusão de lembretes por papel" on public.reminders;

create policy "Exclusão de lembretes por papel" on public.reminders
  for delete
  using (
    workspace_id = public.get_auth_user_workspace_id()
    and (
      (select role from public.profiles where id = auth.uid()) in ('admin', 'gerente')
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );
