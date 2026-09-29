import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarSequencias } from "./actions"
import { SequenciasClient } from "./sequencias-client"

export default async function SequenciasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  const sequencias = await listarSequencias()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <SequenciasClient sequenciasIniciais={sequencias} papel={perfil.role} />
    </div>
  )
}
