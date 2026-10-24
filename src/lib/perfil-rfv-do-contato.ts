// B43-01: o perfil RFV de cada contato, para a lista de contatos, o perfil do contato e
// o painel do chat. É o perfil da hora, pela mesma regra da aba RFV dos Relatórios
// (`perfis_rfv_da_empresa`, B42-01: base da empresa inteira, só devolve contato que
// quem chama pode ver). Nada fica guardado: a compra registrada agora já muda o perfil.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/integrations/supabase/types"
import { PERFIL_POR_ID, type PerfilRfv } from "@/lib/relatorios/rfv"

/**
 * Perfil de cada contato pedido. Contato sem compra fica fora do mapa ("Sem compras").
 * Se a leitura falhar, vem null: a tela abre sem o perfil ("—") em vez de quebrar.
 */
export async function perfisRfvDosContatos(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<Map<string, PerfilRfv> | null> {
  const perfis = new Map<string, PerfilRfv>()
  if (ids.length === 0) return perfis
  try {
    const { data, error } = await supabase.rpc("perfis_rfv_da_empresa").in("contact_id", ids)
    if (error) return null
    for (const linha of data ?? []) {
      if (linha.perfil in PERFIL_POR_ID) perfis.set(linha.contact_id, linha.perfil as PerfilRfv)
    }
    return perfis
  } catch {
    return null
  }
}

/** O perfil de um contato para a tela: o perfil, null (sem compras) ou undefined (não leu). */
export function perfilDoMapa(perfis: Map<string, PerfilRfv> | null, id: string): PerfilRfv | null | undefined {
  return perfis ? (perfis.get(id) ?? null) : undefined
}
