import { sessaoAtual } from "@/lib/sessao"
import { FunilRecompra } from "../components/funil-recompra"
import { listarCardsRecompra, listarAtendentes, listarFunisDaEmpresa } from "../actions"

export const metadata = { title: "Funil de Recompra" }

export default async function RecompraPage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes, funis] = await Promise.all([
    listarCardsRecompra(),
    listarAtendentes(),
    listarFunisDaEmpresa(),
  ])

  return <FunilRecompra cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} funis={funis} />
}
