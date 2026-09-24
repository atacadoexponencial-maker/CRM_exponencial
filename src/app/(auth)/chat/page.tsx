import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { ChatLayout } from "./components/chat-layout"
import { listarConversas } from "./conversas"

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ conversa?: string }> }) {
  const { conversa: conversaInicialId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, name, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) redirect("/login")

  const { data: atendentesRows } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", perfil.workspace_id)
    .order("name", { ascending: true })

  const atendentes = (atendentesRows ?? []).map((p) => ({ id: p.id, nome: p.name ?? "" }))

  let atendentesTransferir = atendentes

  if (perfil.role === "atendente") {
    const { data: userTeamsRows } = await supabase
      .from("user_teams")
      .select("team_id")
      .eq("user_id", user.id)

    const teamIds = (userTeamsRows ?? []).map((r) => r.team_id)

    if (teamIds.length > 0) {
      const { data: memberRows } = await supabase
        .from("user_teams")
        .select("user_id, profile:profiles!user_id(id, name)")
        .in("team_id", teamIds)
        .neq("user_id", user.id)

      type MemberRow = { user_id: string; profile: { id: string; name: string | null } | null }
      const seen = new Set<string>()
      atendentesTransferir = []
      for (const row of (memberRows ?? []) as unknown as MemberRow[]) {
        if (row.profile && !seen.has(row.profile.id)) {
          seen.add(row.profile.id)
          atendentesTransferir.push({ id: row.profile.id, nome: row.profile.name ?? "" })
        }
      }
      atendentesTransferir.sort((a, b) => a.nome.localeCompare(b.nome))
    } else {
      atendentesTransferir = []
    }
  }

  const [labelsRows, quickRepliesRows] = await Promise.all([
    supabase
      .from("labels")
      .select("id, name, color")
      .eq("workspace_id", perfil.workspace_id)
      .order("name"),
    supabase
      .from("quick_replies")
      .select("id, title, content")
      .eq("workspace_id", perfil.workspace_id)
      .order("created_at", { ascending: true }),
  ])

  const etiquetasDisponiveis = (labelsRows.data ?? []).map((l) => ({
    id: l.id,
    nome: l.name,
    cor: l.color,
  }))

  const mensagensRapidas = (quickRepliesRows.data ?? []).map((r) => ({
    id: r.id,
    titulo: r.title,
    conteudo: r.content,
  }))

  const conversas = await listarConversas(supabase, {
    workspaceId: perfil.workspace_id,
    papel: perfil.role,
    userId: user.id,
  })

  return (
    <ChatLayout
      conversas={conversas}
      papel={perfil.role}
      nomeUsuario={perfil.name}
      workspaceId={perfil.workspace_id}
      atendentes={atendentes}
      atendentesTransferir={atendentesTransferir}
      etiquetasDisponiveis={etiquetasDisponiveis}
      mensagensRapidas={mensagensRapidas}
      conversaInicialId={conversaInicialId ?? null}
    />
  )
}
