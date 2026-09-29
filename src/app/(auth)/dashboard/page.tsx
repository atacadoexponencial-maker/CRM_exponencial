import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarMetricasDashboard } from "./actions"
import { DashboardClient } from "./components/dashboard-client"

export default async function DashboardPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil) redirect("/login")

  const [metricas, { data: atendentesData }] = await Promise.all([
    buscarMetricasDashboard({ periodo: "30d" }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])

  if (!metricas) redirect("/login")

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id, nome: a.name }))

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <DashboardClient metricasIniciais={metricas} atendentes={atendentes} papel={perfil.role} />
    </div>
  )
}
