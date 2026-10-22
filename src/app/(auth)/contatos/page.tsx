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
  // B37-01: já com o total, e os valores de nicho e atendente para os filtros.
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
      nichos={valores.nichos}
      atendentes={valores.atendentes}
      etiquetas={valores.etiquetas}
      filtrosSalvos={filtrosSalvos}
      papel={perfil?.role ?? "atendente"}
      totalLixeira={totalLixeira}
    />
  )
}
