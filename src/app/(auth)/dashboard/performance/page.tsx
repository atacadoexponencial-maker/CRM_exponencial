import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarPerformanceVendedores } from "../actions"
import { PerformanceClient } from "./performance-client"

export default async function PerformancePage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Atendente não tem acesso a esta página
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/dashboard")

  const linhas = await buscarPerformanceVendedores({ periodo: "30d" })
  if (!linhas) redirect("/dashboard")

  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-8">
      <PerformanceClient linhasIniciais={linhas} />
    </div>
  )
}
