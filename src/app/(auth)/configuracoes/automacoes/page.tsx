import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarRegras } from "./actions"
import { ListaClient } from "./lista-client"
import { carregarOpcoesEditor } from "./opcoes-editor"

export default async function AutomacoesPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const [regras, opcoes] = await Promise.all([listarRegras(), carregarOpcoesEditor(supabase, perfil.workspace_id)])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <ListaClient regras={regras} opcoes={opcoes} />
    </div>
  )
}
