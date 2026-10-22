import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCampanhas } from "./actions"
import { CampanhasClient } from "./campanhas-client"

export const metadata = { title: "Campanhas" }

export default async function CampanhasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Atendente não tem acesso a campanhas
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil?motivo=sem-permissao")

  const campanhas = await listarCampanhas()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <CampanhasClient campanhasIniciais={campanhas} />
    </div>
  )
}
