import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarRegraParaEditor } from "../actions"
import { carregarOpcoesEditor } from "../opcoes-editor"
import { EditorClient } from "./editor-client"

// `nova` cria uma regra; `nova?antiga=<id>` abre uma regra da primeira versão
// convertida em fluxo, e salvar cria a versão nova dela.
export default async function EditorAutomacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ antiga?: string; salva?: string }>
}) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const [{ id }, { antiga, salva }] = await Promise.all([params, searchParams])
  const [resultado, opcoes] = await Promise.all([
    buscarRegraParaEditor(id, antiga ?? null),
    carregarOpcoesEditor(supabase, perfil.workspace_id),
  ])
  if ("redirecionar" in resultado) redirect(resultado.redirecionar)

  // A chave recria o editor ao trocar de regra, para o desenho de uma não ficar na outra
  return (
    <EditorClient
      key={resultado.regra.id ?? `nova:${antiga ?? ""}`}
      regra={resultado.regra}
      opcoes={opcoes}
      acabouDeSalvar={salva === "1"}
    />
  )
}
