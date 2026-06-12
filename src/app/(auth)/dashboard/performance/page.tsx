import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { buscarPerformanceVendedores } from "../actions"
import { PerformanceClient } from "./performance-client"

export default async function PerformancePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

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
