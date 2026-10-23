import { sessaoAtual } from "@/lib/sessao"
import { FunilEntrada } from "./components/funil-entrada"
import { listarCardsEntrada, listarAtendentes, listarFunisDaEmpresa } from "./actions"

export const metadata = { title: "Funil de Entrada" }

export default async function PipelinePage() {
  const { perfil: profile } = await sessaoAtual()

  const [cards, atendentes, funis] = await Promise.all([
    listarCardsEntrada(),
    listarAtendentes(),
    listarFunisDaEmpresa(),
  ])

  return (
    <>
      <h1 className="sr-only">Funil de Entrada</h1>
      <FunilEntrada cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} funis={funis} />
    </>
  )
}
