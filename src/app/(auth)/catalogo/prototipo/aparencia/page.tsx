import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PrototipoAparenciaClient } from "./prototipo-aparencia-client"

export default async function PrototipoAparenciaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  return <PrototipoAparenciaClient />
}
