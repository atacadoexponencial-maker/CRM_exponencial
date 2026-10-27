import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarAgendaEquipe } from "../actions"
import { AgendaEquipeClient } from "./agenda-equipe-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Agenda da equipe" }

export default async function AgendaEquipePage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

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
    <div className={CLASSE_DA_PAGINA}>
      <AgendaEquipeClient
        itensIniciais={dados.itens}
        atendentes={atendentes}
      />
    </div>
  )
}
