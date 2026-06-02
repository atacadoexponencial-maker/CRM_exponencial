import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { ListaContatos } from "./components/lista-contatos"
import { listarContatos } from "./actions"

export default async function ContatosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const contatos = await listarContatos()

  return (
    <ListaContatos
      contatos={contatos}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
