import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarCampanhas } from "./actions"
import { CampanhasClient } from "./campanhas-client"

export default async function CampanhasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  // Atendente não tem acesso a campanhas
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  const campanhas = await listarCampanhas()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <CampanhasClient campanhasIniciais={campanhas} />
    </div>
  )
}
