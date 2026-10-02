import { sessaoAtual } from "@/lib/sessao"
import { FunilEntrada } from "./components/funil-entrada"
import { listarCardsEntrada, listarAtendentes } from "./actions"

export default async function PipelinePage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes] = await Promise.all([
    listarCardsEntrada(),
    listarAtendentes(),
  ])

  return <FunilEntrada cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
}
