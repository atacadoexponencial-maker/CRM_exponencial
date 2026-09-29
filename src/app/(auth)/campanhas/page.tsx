import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCampanhas } from "./actions"
import { CampanhasClient } from "./campanhas-client"

export default async function CampanhasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Atendente não tem acesso a campanhas
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  const campanhas = await listarCampanhas()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <CampanhasClient campanhasIniciais={campanhas} />
    </div>
  )
}
