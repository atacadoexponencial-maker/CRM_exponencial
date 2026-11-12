// B51-01: quem cuida da plataforma (cria convites). Não é papel de empresa: a lista
// fica na tabela `plataforma_admins`.
//
// Auditoria run-2 (pista 5): a lista vale pela conta (`user_id`), não pelo texto do
// e-mail. O CRM cria conta confirmada com qualquer e-mail, então o e-mail sozinho não
// prova quem é a pessoa (ver a migration 20261106000001).
//
// **Só backend.** Usa a chave de serviço.

import { createServiceClient } from "@/integrations/supabase/service"

export async function ehDaPlataforma(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const { data } = await createServiceClient()
    .from("plataforma_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}
