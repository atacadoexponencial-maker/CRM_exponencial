// O fuso da empresa (B48-14), que as telas usam para mostrar as datas e o motor
// das automações para o horário comercial. Quem ainda não escolheu fica em Brasília.

import { cache } from "react"
import { sessaoAtual } from "@/lib/sessao"
import { fusoValido, FUSO_DA_OPERACAO } from "@/lib/datas"
import type { createServiceClient } from "@/integrations/supabase/service"

/** O fuso de uma empresa, para quem roda sem sessão (o motor das automações). */
export async function fusoDoWorkspace(supabase: ReturnType<typeof createServiceClient>, workspaceId: string): Promise<string> {
  const { data, error } = await supabase.from("workspaces").select("fuso").eq("id", workspaceId).maybeSingle()
  if (error) throw error
  return fusoValido(data?.fuso)
}

/** O fuso da empresa de quem está logado, lido uma vez por requisição; sem sessão, Brasília. */
export const fusoDaEmpresa = cache(async (): Promise<string> => {
  const { supabase, perfil } = await sessaoAtual()
  if (!perfil) return FUSO_DA_OPERACAO
  const { data } = await supabase.from("workspaces").select("fuso").eq("id", perfil.workspace_id).maybeSingle()
  return fusoValido(data?.fuso)
})
