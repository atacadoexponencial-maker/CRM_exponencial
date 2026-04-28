import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { MOCK_CONVERSAS } from "./mock-conversas"
import { MOCK_MENSAGENS } from "./mock-mensagens"
import { ChatLayout } from "./components/chat-layout"

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", user.id)
    .single()

  if (!perfil) redirect("/login")

  return (
    <ChatLayout
      conversas={MOCK_CONVERSAS}
      mensagens={MOCK_MENSAGENS}
      papel={perfil.role}
      nomeUsuario={perfil.name}
    />
  )
}
