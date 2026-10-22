import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarCampanha, numerosParaCampanha, opcoesSegmentacao } from "../actions"
import { EditorCampanhaClient } from "./editor-campanha-client"

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
  const [opcoes, numeros] = await Promise.all([opcoesSegmentacao(), numerosParaCampanha()])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-8 lg:px-10">
      <EditorCampanhaClient campanha={campanha} opcoes={opcoes} numeros={numeros} />
    </div>
  )
}
