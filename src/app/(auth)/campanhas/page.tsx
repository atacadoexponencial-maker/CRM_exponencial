import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCampanhas } from "./actions"
import { CampanhasClient } from "./campanhas-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Campanhas" }

export default async function CampanhasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Atendente não tem acesso a campanhas
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil?motivo=sem-permissao")

  const campanhas = await listarCampanhas()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <CampanhasClient campanhasIniciais={campanhas} />
    </div>
  )
}
