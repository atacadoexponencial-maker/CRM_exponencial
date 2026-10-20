import { sessaoAtual } from "@/lib/sessao"
import { FunilEntrada } from "./components/funil-entrada"
import { listarCardsEntrada, listarAtendentes } from "./actions"

export const metadata = { title: "Funil de Entrada" }

export default async function PipelinePage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes] = await Promise.all([
    listarCardsEntrada(),
    listarAtendentes(),
  ])

  return (
    <>
      <h1 className="sr-only">Funil de Entrada</h1>
      <FunilEntrada cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
    </>
  )
}
