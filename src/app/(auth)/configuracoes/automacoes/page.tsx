import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarAutomacoes } from "./actions"
import { AutomacoesClient } from "./automacoes-client"

export default async function AutomacoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  const [automacoes, { data: labels }, { data: profiles }] = await Promise.all([
    listarAutomacoes(),
    supabase
      .from("labels")
      .select("id, name, color")
      .eq("workspace_id", perfil.workspace_id)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])

  const etiquetas = (labels ?? []).map((l) => ({ id: l.id, nome: l.name, cor: l.color }))
  const atendentes = (profiles ?? []).map((p) => ({ id: p.id, nome: p.name }))

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <AutomacoesClient
        automacoesIniciais={automacoes}
        etiquetas={etiquetas}
        atendentes={atendentes}
      />
    </div>
  )
}
