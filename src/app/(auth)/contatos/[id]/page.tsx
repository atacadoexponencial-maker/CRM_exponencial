import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { PerfilContato } from "./components/perfil-contato"
import { MOCK_PERFIS_CONTATO } from "../mock-contatos"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PerfilContatoPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const contato = MOCK_PERFIS_CONTATO[id] ?? null

  return (
    <PerfilContato
      contato={contato}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
