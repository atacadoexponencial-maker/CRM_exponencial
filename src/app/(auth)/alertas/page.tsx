import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarAlertas } from "./actions"
import { AlertasClient } from "./alertas-client"

export default async function AlertasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const dados = await listarAlertas()
  if (!dados) redirect("/login")

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <AlertasClient
        alertasIniciais={dados.alertas}
        configInicial={dados.config}
        papel={perfil?.role ?? "atendente"}
      />
    </div>
  )
}
