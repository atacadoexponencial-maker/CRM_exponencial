// B35-01: a carteira de um vendedor é o conjunto de contatos cujo atendente do contato é
// ele. Toda mudança passa por aqui, para ficar no histórico (`carteira_historico`).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"

export type MotivoDaCarteira = "transferencia" | "remocao" | "distribuicao" | "ultima_venda" | "pelo_card" | "pelo_chat"

export const ROTULO_MOTIVO: Record<MotivoDaCarteira, string> = {
  transferencia: "transferência",
  remocao: "remoção",
  distribuicao: "distribuição",
  ultima_venda: "última venda",
  pelo_card: "pelo card",
  pelo_chat: "pelo chat",
}

type Cliente = SupabaseClient<Database>

export type MudancaDeCarteira = {
  workspaceId: string
  contactId: string
  de: string | null
  para: string | null
  motivo: MotivoDaCarteira
  /** Quem fez; nulo quando foi uma automação. */
  por: string | null
}

/** Grava uma linha no histórico. Nada a gravar quando "de" e "para" são iguais. */
export async function registrarMudancasDeCarteira(supabase: Cliente, mudancas: MudancaDeCarteira[]): Promise<{ error: { message: string } | null }> {
  const linhas = mudancas
    .filter((m) => m.de !== m.para)
    .map((m) => ({ workspace_id: m.workspaceId, contact_id: m.contactId, de_atendente_id: m.de, para_atendente_id: m.para, motivo: m.motivo, alterado_por: m.por }))
  if (linhas.length === 0) return { error: null }
  const { error } = await supabase.from("carteira_historico").insert(linhas)
  return { error }
}

/**
 * B45-02: um dono só. Passa os contatos para `para` (nulo = sem dono), com todos os
 * cards e todas as conversas deles, e grava a troca no histórico. Quem chama já
 * conferiu a permissão e que `para` é da empresa.
 */
export async function passarContatosPara(
  supabase: Cliente,
  { workspaceId, contactIds, para, motivo, por }: { workspaceId: string; contactIds: string[]; para: string | null; motivo: MotivoDaCarteira; por: string | null }
): Promise<{ error: { message: string; code?: string } | null }> {
  const ids = [...new Set(contactIds)]
  if (ids.length === 0) return { error: null }

  const { data: antes, error: erroAntes } = await supabase.from("contacts").select("id, atendente_id").in("id", ids).eq("workspace_id", workspaceId)
  if (erroAntes) return { error: erroAntes }

  const [{ error: e1 }, { error: e2 }, { error: e3 }] = await Promise.all([
    supabase.from("contacts").update({ atendente_id: para }).in("id", ids).eq("workspace_id", workspaceId),
    supabase.from("pipeline_cards").update({ atendente_id: para }).in("contact_id", ids).eq("workspace_id", workspaceId),
    supabase.from("conversations").update({ assigned_to: para }).in("contact_id", ids).eq("workspace_id", workspaceId),
  ])
  const erro = e1 ?? e2 ?? e3
  if (erro) return { error: erro }

  return registrarMudancasDeCarteira(
    supabase,
    (antes ?? []).map((c) => ({ workspaceId, contactId: c.id, de: c.atendente_id, para, motivo, por }))
  )
}

/** Atendente atual do contato, para o "de" do histórico. */
export async function atendenteDoContato(supabase: Cliente, contactId: string): Promise<string | null> {
  const { data } = await supabase.from("contacts").select("atendente_id").eq("id", contactId).maybeSingle()
  return data?.atendente_id ?? null
}
