import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarMinhaAgenda } from "./actions"
import { AgendaClient } from "./agenda-client"

export const metadata = { title: "Minha agenda" }

export default async function AgendaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const itens = await listarMinhaAgenda()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-8 lg:px-10">
      <AgendaClient itensIniciais={itens} papel={perfil?.role ?? "atendente"} />
    </div>
  )
}
