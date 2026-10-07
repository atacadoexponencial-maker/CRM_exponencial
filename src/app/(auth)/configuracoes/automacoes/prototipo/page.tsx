import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PrototipoClient } from "./prototipo-client"

// Protótipo da B11-01: dados fixos, nada é gravado. No branch, o item
// "Automações" do menu abre esta rota. Sai na B11-05.
export default async function PrototipoAutomacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ vazio?: string }>
}) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const { vazio } = await searchParams
  const listaVazia = vazio === "1"

  // A chave recria o estado em memória ao alternar entre lista vazia e cheia
  return <PrototipoClient key={listaVazia ? "vazia" : "cheia"} vazio={listaVazia} />
}
