import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarCampanha, numerosParaCampanha } from "../actions"
import { valoresDoFiltro } from "../../contatos/actions"
import { listarFiltrosSalvos } from "../../contatos/filtros-salvos"
import { EditorCampanhaClient } from "./editor-campanha-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { cn } from "@/lib/utils"

export const metadata = { title: "Campanha" }

export default async function EditorCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil?motivo=sem-permissao")

  const campanha = id === "nova" ? null : await buscarCampanha(id)
  if (id !== "nova" && !campanha) redirect("/campanhas")
  // Campanhas já enviadas/cancelando vão para o relatório
  if (campanha && !["rascunho", "agendada"].includes(campanha.status)) {
    redirect(`/campanhas/${id}/relatorio`)
  }

  // B7-03: os números que a campanha pode usar vêm do servidor, com o canal de
  // cada um. O editor não decide canal.
  // B42-02: o painel do filtro usa os atendentes, as etiquetas e os funis da empresa.
  // B42-03: e os filtros salvos da empresa, para partir de um deles (B42-04: os de campanha).
  const [opcoes, numeros, filtrosSalvos] = await Promise.all([valoresDoFiltro(), numerosParaCampanha(), listarFiltrosSalvos("campanhas")])

  return (
    <div className={cn(CLASSE_DA_PAGINA, "*:max-w-3xl")}>
      <EditorCampanhaClient campanha={campanha} opcoes={opcoes} numeros={numeros} filtrosSalvos={filtrosSalvos} />
    </div>
  )
}
