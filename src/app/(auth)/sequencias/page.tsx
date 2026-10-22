import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarSequencias } from "./actions"
import { SequenciasClient } from "./sequencias-client"

export const metadata = { title: "Sequências" }

export default async function SequenciasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil?motivo=sem-permissao")

  const sequencias = await listarSequencias()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <SequenciasClient sequenciasIniciais={sequencias} papel={perfil.role} />
    </div>
  )
}
