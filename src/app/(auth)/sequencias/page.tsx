import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { garantirSequenciasPredefinidas } from "@/lib/sequencias"
import { listarSequencias } from "./actions"
import { SequenciasClient } from "./sequencias-client"

export default async function SequenciasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) redirect("/perfil")

  // Garante que as 4 sequências do método existem para o workspace
  await garantirSequenciasPredefinidas(perfil.workspace_id)

  const sequencias = await listarSequencias()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <SequenciasClient sequenciasIniciais={sequencias} papel={perfil.role} />
    </div>
  )
}
