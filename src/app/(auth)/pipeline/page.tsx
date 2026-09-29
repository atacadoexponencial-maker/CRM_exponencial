import { sessaoAtual } from "@/lib/sessao"
import { FunilExpansao } from "./components/funil-expansao"
import { listarCardsExpansao, listarAtendentes } from "./actions"

export default async function PipelinePage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes] = await Promise.all([
    listarCardsExpansao(),
    listarAtendentes(),
  ])

  return <FunilExpansao cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
}
