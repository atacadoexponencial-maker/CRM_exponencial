// B52-02: o link de criar senha nova. Conferir não gasta: programas de e-mail abrem o
// link antes da pessoa. Quem gasta é a função do banco, na hora de salvar.
//
// **Só backend.** Usa a chave de serviço.

import { createServiceClient } from "@/integrations/supabase/service"
import { hashDoCodigo } from "@/lib/convites"

/** A mesma para vencido, usado, derrubado, inventado e conta desativada (CA-B52-11). */
export const AVISO_LINK_INVALIDO = "Este link não vale mais. Peça outro para criar sua senha nova."

/** O link ainda vale (e a conta está ativa)? Só olha, não gasta. */
export async function linkDeSenhaNovaValido(codigo: unknown): Promise<boolean> {
  if (typeof codigo !== "string" || !codigo) return false
  const service = createServiceClient()
  const { data } = await service
    .from("redefinicoes_de_senha")
    .select("user_id")
    .eq("token_hash", hashDoCodigo(codigo))
    .is("usado_em", null)
    .is("cancelado_em", null)
    .gt("expira_em", new Date().toISOString())
    .maybeSingle()
  if (!data) return false
  const { data: perfil } = await service.from("profiles").select("status").eq("id", (data as { user_id: string }).user_id).maybeSingle()
  return (perfil as { status: string } | null)?.status === "active"
}
