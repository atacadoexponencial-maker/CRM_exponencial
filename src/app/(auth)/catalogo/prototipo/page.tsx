import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PrototipoProdutosClient } from "./prototipo-produtos-client"

export default async function PrototipoCatalogoPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  return <PrototipoProdutosClient />
}
