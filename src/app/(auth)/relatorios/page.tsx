import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { hojeNoFuso, periodoPadrao } from "@/lib/relatorios/visao-geral"
import { buscarVisaoGeral } from "./actions"
import { RelatoriosClient } from "./components/relatorios-client"

export const metadata = { title: "Relatórios" }

export default async function RelatoriosPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) redirect("/login")

  const hoje = hojeNoFuso()
  const [visao, { data: atendentesData }] = await Promise.all([
    buscarVisaoGeral({ periodo: periodoPadrao(hoje), atendenteId: null }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])
  if (!visao) redirect("/login")

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id, nome: a.name }))

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <RelatoriosClient visaoInicial={visao} atendentes={atendentes} papel={perfil.role} hoje={hoje} />
    </div>
  )
}
