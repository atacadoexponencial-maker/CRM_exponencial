import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarAutomacoes } from "./actions"
import { AutomacoesClient } from "./automacoes-client"

export default async function AutomacoesPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

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
