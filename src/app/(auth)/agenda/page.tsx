import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { listarMinhaAgenda } from "./actions"
import { AgendaClient } from "./agenda-client"

export default async function AgendaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const itens = await listarMinhaAgenda()

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <AgendaClient itensIniciais={itens} papel={perfil?.role ?? "atendente"} />
    </div>
  )
}
