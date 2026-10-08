import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarRegraParaEditor } from "../actions"
import { carregarOpcoesEditor } from "../opcoes-editor"
import { EditorClient } from "./editor-client"

// `nova` cria uma regra; o id abre uma regra salva.
export default async function EditorAutomacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ salva?: string }>
}) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const [{ id }, { salva }] = await Promise.all([params, searchParams])
  const [resultado, opcoes] = await Promise.all([
    buscarRegraParaEditor(id),
    carregarOpcoesEditor(supabase, perfil.workspace_id),
  ])
  if ("redirecionar" in resultado) redirect(resultado.redirecionar)

  // A chave recria o editor ao trocar de regra, para o desenho de uma não ficar na outra
  return (
    <EditorClient
      key={resultado.regra.id ?? "nova"}
      regra={resultado.regra}
      opcoes={opcoes}
      acabouDeSalvar={salva === "1"}
    />
  )
}
