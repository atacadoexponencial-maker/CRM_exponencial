// B35-01: a carteira de um vendedor é o conjunto de contatos cujo atendente do contato é
// ele. Toda mudança passa por aqui, para ficar no histórico (`carteira_historico`).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"

export type MotivoDaCarteira = "transferencia" | "remocao" | "distribuicao" | "ultima_venda" | "pelo_card"

export const ROTULO_MOTIVO: Record<MotivoDaCarteira, string> = {
  transferencia: "transferência",
  remocao: "remoção",
  distribuicao: "distribuição",
  ultima_venda: "última venda",
  pelo_card: "pelo card",
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

/** Atendente atual do contato, para o "de" do histórico. */
export async function atendenteDoContato(supabase: Cliente, contactId: string): Promise<string | null> {
  const { data } = await supabase.from("contacts").select("atendente_id").eq("id", contactId).maybeSingle()
  return data?.atendente_id ?? null
}
