import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { ListaContatos } from "./components/lista-contatos"
import { MOCK_CONTATOS } from "./mock-contatos"

export default async function ContatosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return (
    <ListaContatos
      contatos={MOCK_CONTATOS}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
