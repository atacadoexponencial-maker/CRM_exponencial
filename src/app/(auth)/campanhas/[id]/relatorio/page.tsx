import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { relatorioCampanha } from "../../actions"
import { RelatorioCampanhaClient } from "./relatorio-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Relatório da campanha" }

export default async function RelatorioCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil?motivo=sem-permissao")

  const relatorio = await relatorioCampanha(id)
  if (!relatorio) redirect("/campanhas")

  return (
    <div className={CLASSE_DA_PAGINA}>
      <RelatorioCampanhaClient relatorio={relatorio} />
    </div>
  )
}
