-- B19-03: as credenciais de `whatsapp_connections` deixam de ser legíveis pelo
-- navegador — agora de verdade.
--
-- A B2-02 (20260917000001) fez `revoke select (access_token, instance_token)`, mas no
-- Postgres o revoke de coluna não tem efeito enquanto o papel tem SELECT na tabela
-- inteira, que é o grant padrão do Supabase. Conferido no remoto em 06/10/2026:
-- `has_column_privilege('authenticated', ..., 'access_token', 'SELECT')` era true.
--
-- Agora o SELECT da tabela sai e volta coluna a coluna, sem as duas credenciais.
-- Quem precisa delas (envio, templates, webhook, ritmo, saúde, campanhas,
-- automações, sequências) lê pela service role, depois de conferir a empresa.

revoke select on public.whatsapp_connections from anon, authenticated;

grant select (
  id, workspace_id, phone_number, display_name, status, waba_id, phone_number_id,
  created_at, canal, instance_id, state_reason, disconnected_at
) on public.whatsapp_connections to authenticated;
