import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarFunisParaGerenciar } from "./actions"
import { FunisClient } from "./funis-client"

export const metadata = { title: "Funis" }

// B41-01: Admin e Gerente gerenciam os funis da empresa (SUP-B41-01).
export default async function FunisPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil?motivo=sem-permissao")

  const dados = await listarFunisParaGerenciar()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <FunisClient dados={dados} />
    </div>
  )
}
