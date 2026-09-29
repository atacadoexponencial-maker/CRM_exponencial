import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarMinhaAgenda } from "./actions"
import { AgendaClient } from "./agenda-client"

export default async function AgendaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const itens = await listarMinhaAgenda()

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <AgendaClient itensIniciais={itens} papel={perfil?.role ?? "atendente"} />
    </div>
  )
}
