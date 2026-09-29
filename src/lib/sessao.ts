import { cache } from "react"
import { createClient } from "@/integrations/supabase/server"

export type PerfilDaSessao = {
  id: string
  role: string
  name: string
  workspace_id: string
}

/**
 * Quem está logado e qual o seu perfil, resolvidos uma única vez por
 * requisição.
 *
 * `cache` do React memoiza o resultado durante o render de uma requisição:
 * layout, página e as actions chamadas por ela recebem o mesmo objeto sem
 * repetir a ida ao Supabase Auth nem a leitura de `profiles`. Em requisições
 * distintas (uma mutation disparada do navegador, por exemplo) resolve de novo.
 *
 * Sem sessão devolve `user: null, perfil: null`; quem chama decide se
 * redireciona ou devolve vazio, como já fazia.
 */
export const sessaoAtual = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, role, name, workspace_id")
    .eq("id", user.id)
    .single()

  return { supabase, user, perfil: (perfil as PerfilDaSessao | null) ?? null }
})
