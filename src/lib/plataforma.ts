// B51-01: quem cuida da plataforma (cria convites). Não é papel de empresa: a lista
// fica na tabela `plataforma_admins`, por e-mail.
//
// **Só backend.** Usa a chave de serviço.

import { createServiceClient } from "@/integrations/supabase/service"

export async function ehDaPlataforma(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const { data } = await createServiceClient()
    .from("plataforma_admins")
    .select("email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle()
  return !!data
}
