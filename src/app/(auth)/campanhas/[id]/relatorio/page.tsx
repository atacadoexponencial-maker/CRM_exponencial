import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { relatorioCampanha } from "../../actions"
import { RelatorioCampanhaClient } from "./relatorio-client"

export default async function RelatorioCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  const relatorio = await relatorioCampanha(id)
  if (!relatorio) redirect("/campanhas")

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <RelatorioCampanhaClient relatorio={relatorio} />
    </div>
  )
}
