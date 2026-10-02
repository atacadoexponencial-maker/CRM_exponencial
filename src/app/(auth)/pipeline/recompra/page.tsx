import { sessaoAtual } from "@/lib/sessao"
import { FunilRecompra } from "../components/funil-recompra"
import { listarCardsRecompra, listarAtendentes } from "../actions"

export default async function RecompraPage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes] = await Promise.all([
    listarCardsRecompra(),
    listarAtendentes(),
  ])

  return <FunilRecompra cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
}
