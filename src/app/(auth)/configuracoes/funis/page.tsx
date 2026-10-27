import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarFunisParaGerenciar } from "./actions"
import { FunisClient } from "./funis-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Funis" }

// B41-01: Admin e Gerente gerenciam os funis da empresa (SUP-B41-01).
export default async function FunisPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil?motivo=sem-permissao")

  const dados = await listarFunisParaGerenciar()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <FunisClient dados={dados} />
    </div>
  )
}
