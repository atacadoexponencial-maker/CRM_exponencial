import { notFound } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { FunilPersonalizado } from "../../components/funil-personalizado"
import { listarAtendentes, listarCardsDoFunil, listarFunisDaEmpresa } from "../../actions"

export const metadata = { title: "Funil" }

// B41-01: quadro de um funil da empresa. A RLS só devolve os funis da empresa de quem
// está logado; funil de outra empresa ou apagado dá "não encontrado".
export default async function FunilDaEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { perfil } = await sessaoAtual()

  const funis = await listarFunisDaEmpresa()
  const funil = funis.find((f) => f.id === id)
  if (!funil) notFound()

  const [cards, atendentes] = await Promise.all([listarCardsDoFunil(funil.id), listarAtendentes()])

  return (
    <>
      <h1 className="sr-only">{funil.nome}</h1>
      <FunilPersonalizado
        funil={funil}
        cards={cards}
        papel={perfil?.role ?? "atendente"}
        atendentes={atendentes}
        funis={funis.map((f) => ({ id: f.id, nome: f.nome }))}
      />
    </>
  )
}
