import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarAgendaEquipe } from "../actions"
import { AgendaEquipeClient } from "./agenda-equipe-client"

export default async function AgendaEquipePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/agenda")

  const [dados, { data: atendentesData }] = await Promise.all([
    listarAgendaEquipe(),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])

  if (!dados) redirect("/agenda")

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id, nome: a.name }))

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <AgendaEquipeClient
        itensIniciais={dados.itens}
        sequenciasIniciais={dados.sequencias}
        atendentes={atendentes}
      />
    </div>
  )
}
