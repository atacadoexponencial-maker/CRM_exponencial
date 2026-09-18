import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { buscarCampanha, numerosParaCampanha, opcoesSegmentacao } from "../actions"
import { EditorCampanhaClient } from "./editor-campanha-client"

export default async function EditorCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

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
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <EditorCampanhaClient campanha={campanha} opcoes={opcoes} numeros={numeros} />
    </div>
  )
}
