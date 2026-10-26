import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { cabecalhoDoDia } from "@/lib/painel-dashboard"
import { buscarPainelDashboard, listarEsperandoResposta, listarParaHoje } from "./actions"
import { DashboardClient } from "./components/dashboard-client"
import { listarCamposDaEmpresa } from "../contatos/campos-personalizados"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil) redirect("/login")

  // B36-04: os blocos novos (Para hoje, Esperando resposta) saem junto com as métricas.
  // B38-07: e os campos personalizados, para o filtro por campo
  const [painel, { data: atendentesData }, paraHoje, esperando, campos] = await Promise.all([
    buscarPainelDashboard({ periodo: "30d" }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
    listarParaHoje(),
    listarEsperandoResposta(),
    listarCamposDaEmpresa(),
  ])

  if (!painel) redirect("/login")

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id, nome: a.name }))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 lg:px-10">
      <DashboardClient
        painelInicial={painel}
        atendentes={atendentes}
        papel={perfil.role}
        cabecalho={cabecalhoDoDia(perfil.name)}
        paraHoje={paraHoje}
        esperando={esperando}
        campos={campos}
      />
    </div>
  )
}
