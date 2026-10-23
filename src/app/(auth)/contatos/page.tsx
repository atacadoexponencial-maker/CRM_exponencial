import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { ListaContatos } from "./components/lista-contatos"
import { filtrarContatos, valoresDoFiltro } from "./actions"
import { contarLixeira } from "./lixeira/actions"
import { listarFiltrosSalvos } from "./filtros-salvos"

export const metadata = { title: "Contatos" }

export default async function ContatosPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // B10-06: primeira página; o restante vem por "Carregar mais".
  // B37-01: já com o total, e os atendentes para os filtros.
  // B37-03: e os filtros salvos da empresa.
  const [pagina, totalLixeira, valores, filtrosSalvos] = await Promise.all([
    filtrarContatos(),
    contarLixeira(),
    valoresDoFiltro(),
    listarFiltrosSalvos(),
  ])
  const { contatos, total } = "erro" in pagina ? { contatos: [], total: 0 } : pagina

  return (
    <ListaContatos
      contatos={contatos}
      total={total}
      atendentes={valores.atendentes}
      etiquetas={valores.etiquetas}
      funis={valores.funis}
      filtrosSalvos={filtrosSalvos}
      papel={perfil?.role ?? "atendente"}
      totalLixeira={totalLixeira}
    />
  )
}
