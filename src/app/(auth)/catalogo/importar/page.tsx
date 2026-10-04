import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { ImportarClient } from "./importar-client"

// Importar produtos por planilha (B18): só Admin e Gerente.
export default async function ImportarProdutosPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")
  return <ImportarClient />
}
