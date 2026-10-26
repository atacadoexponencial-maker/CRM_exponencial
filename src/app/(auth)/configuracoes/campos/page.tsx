import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCamposParaGerenciar } from "./actions"
import { CamposClient } from "./campos-client"

export const metadata = { title: "Campos personalizados" }

// B38-01: Admin e Gerente gerenciam os campos personalizados da empresa (PER-B38-02).
export default async function CamposPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil?motivo=sem-permissao")

  const campos = await listarCamposParaGerenciar()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <CamposClient campos={campos} />
    </div>
  )
}
