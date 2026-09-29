import { sessaoAtual } from "@/lib/sessao"
import { FunilRetencao } from "../components/funil-retencao"
import { listarCardsRetencao, listarAtendentes } from "../actions"

export default async function RetencaoPage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes] = await Promise.all([
    listarCardsRetencao(),
    listarAtendentes(),
  ])

  return <FunilRetencao cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
}
