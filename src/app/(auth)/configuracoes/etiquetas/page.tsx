import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarEtiquetas } from "./actions"
import { EtiquetasClient } from "./etiquetas-client"

export default async function EtiquetasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  const etiquetas = await listarEtiquetas()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <EtiquetasClient etiquetasIniciais={etiquetas} />
    </div>
  )
}
