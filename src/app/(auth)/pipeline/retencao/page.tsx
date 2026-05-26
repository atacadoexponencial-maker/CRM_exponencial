import { createClient } from "@/integrations/supabase/server"
import { FunilRetencao } from "../components/funil-retencao"
import { listarCardsRetencao, listarAtendentes } from "../actions"

export default async function RetencaoPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single()

  const [cards, atendentes] = await Promise.all([
    listarCardsRetencao(),
    listarAtendentes(),
  ])

  return <FunilRetencao cards={cards} papel={profile?.role ?? "atendente"} atendentes={atendentes} />
}
