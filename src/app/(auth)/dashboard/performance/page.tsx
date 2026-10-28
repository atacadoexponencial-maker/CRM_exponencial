import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarPerformanceVendedores } from "../actions"
import { PerformanceClient } from "./performance-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Performance" }

export default async function PerformancePage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Atendente não tem acesso a esta página
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/dashboard")

  const linhas = await buscarPerformanceVendedores({ periodo: "30d" })
  if (!linhas) redirect("/dashboard")

  return (
    <div className={CLASSE_DA_PAGINA}>
      <PerformanceClient linhasIniciais={linhas} />
    </div>
  )
}
