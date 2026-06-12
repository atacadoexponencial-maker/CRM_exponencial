import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { relatorioCampanha } from "../../actions"
import { RelatorioCampanhaClient } from "./relatorio-client"

export default async function RelatorioCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  const relatorio = await relatorioCampanha(id)
  if (!relatorio) redirect("/campanhas")

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <RelatorioCampanhaClient relatorio={relatorio} />
    </div>
  )
}
