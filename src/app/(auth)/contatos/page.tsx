import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { ListaContatos } from "./components/lista-contatos"
import { listarContatos } from "./actions"
import { TAMANHO_PAGINA_CONTATOS } from "./mock-contatos"

export default async function ContatosPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // B10-06: primeira página; o restante vem por "Carregar mais".
  const contatos = await listarContatos({ limite: TAMANHO_PAGINA_CONTATOS })

  return (
    <ListaContatos
      contatos={contatos}
      temMais={contatos.length === TAMANHO_PAGINA_CONTATOS}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
