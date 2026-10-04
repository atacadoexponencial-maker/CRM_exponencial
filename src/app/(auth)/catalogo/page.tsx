import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCatalogo } from "./actions"
import { ProdutosClient } from "./produtos-client"

export default async function CatalogoPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const catalogo = await listarCatalogo()
  return <ProdutosClient inicial={catalogo} />
}
