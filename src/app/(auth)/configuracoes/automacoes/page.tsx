import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarRegras } from "./actions"
import { ListaClient } from "./lista-client"
import { carregarOpcoesEditor } from "./opcoes-editor"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Automações" }

export default async function AutomacoesPage() {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const [regras, opcoes] = await Promise.all([listarRegras(), carregarOpcoesEditor(supabase, perfil.workspace_id)])

  return (
    <div className={CLASSE_DA_PAGINA}>
      <ListaClient regras={regras} opcoes={opcoes} />
    </div>
  )
}
