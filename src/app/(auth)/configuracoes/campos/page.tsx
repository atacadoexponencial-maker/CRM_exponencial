import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCamposParaGerenciar } from "./actions"
import { CamposClient } from "./campos-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Campos personalizados" }

// B38-01: Admin e Gerente gerenciam os campos personalizados da empresa (PER-B38-02).
export default async function CamposPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil?motivo=sem-permissao")

  const campos = await listarCamposParaGerenciar()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <CamposClient campos={campos} />
    </div>
  )
}
