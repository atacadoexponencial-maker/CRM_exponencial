import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { PerfilContato } from "./components/perfil-contato"
import { buscarDadosContato } from "../actions"

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

  const contato = await buscarDadosContato(id)

  return (
    <PerfilContato
      contato={contato}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
