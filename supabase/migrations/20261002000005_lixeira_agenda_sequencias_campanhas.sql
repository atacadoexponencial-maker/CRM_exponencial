-- B13-03: lembretes e execuções de sequência de contato na lixeira somem da
-- agenda (e voltam ao restaurar); destinatário de campanha cujo contato foi para
-- a lixeira antes do disparo fica "excluido".
--
-- Volta atrás: recriar as quatro políticas sem o "and not contato_na_lixeira(...)"
-- e a regra de status sem 'excluido'.

alter policy "Lembretes visíveis por papel" on public.reminders
  using (
    workspace_id = get_auth_user_workspace_id()
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Atualização de lembretes por papel" on public.reminders
  using (
    workspace_id = get_auth_user_workspace_id()
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Execuções visíveis por papel" on public.sequence_runs
  using (
    workspace_id = get_auth_user_workspace_id()
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );

alter policy "Cancelamento por papel" on public.sequence_runs
  using (
    workspace_id = get_auth_user_workspace_id()
    and (
      (select profiles.role from profiles where profiles.id = auth.uid()) = any (array['admin', 'gerente'])
      or atendente_id = auth.uid()
    )
    and not public.contato_na_lixeira(contact_id)
  );

alter table public.campaign_recipients drop constraint campaign_recipients_status_check;
alter table public.campaign_recipients add constraint campaign_recipients_status_check
  check (status in ('pendente', 'na_fila', 'enviado', 'entregue', 'lido', 'falhou', 'excluido'));
