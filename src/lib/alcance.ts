// B63: o que cada pessoa vê de conversas, contatos e cards. Quem decide é o banco
// (`alcance_do_usuario`, pela escolha da empresa para o cargo); aqui só se lê, para a
// tela filtrar e escolher os canais do tempo real do mesmo jeito.

import type { createClient } from "@/integrations/supabase/server"

type Cliente = Awaited<ReturnType<typeof createClient>>

export const ALCANCES = ["atribuidos", "atribuidos_e_sem_dono", "todos"] as const

/** "atribuidos": só o dela; "atribuidos_e_sem_dono": o dela e o sem dono; "todos": a empresa toda. */
export type Alcance = (typeof ALCANCES)[number]

/** O alcance de quem está logado. Sem perfil ativo, o mais fechado. */
export async function alcanceDaSessao(supabase: Cliente): Promise<Alcance> {
  const { data } = await supabase.rpc("alcance_do_usuario")
  return (ALCANCES as readonly string[]).includes(data ?? "") ? (data as Alcance) : "atribuidos"
}
