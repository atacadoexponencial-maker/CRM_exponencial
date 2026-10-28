import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarMinhaAgenda } from "./actions"
import { AgendaClient } from "./agenda-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Minha agenda" }

export default async function AgendaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const itens = await listarMinhaAgenda()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <AgendaClient itensIniciais={itens} papel={perfil?.role ?? "atendente"} />
    </div>
  )
}
