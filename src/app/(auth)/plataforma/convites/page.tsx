import { notFound, redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { ehDaPlataforma } from "@/lib/plataforma"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { listarConvites } from "./actions"
import { ConvitesClient } from "./convites-client"

export const metadata = { title: "Convites" }

// B51-01: só quem cuida da plataforma. Para os outros, a tela nem existe.
export default async function ConvitesPage() {
  const { user } = await sessaoAtual()
  if (!user) redirect("/login")
  if (!(await ehDaPlataforma(user.email))) notFound()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <ConvitesClient convitesIniciais={await listarConvites()} />
    </div>
  )
}
