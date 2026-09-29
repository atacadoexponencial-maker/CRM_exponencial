import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { ChatLayout } from "./components/chat-layout"
import { listarConversas, TAMANHO_PAGINA_CONVERSAS } from "./conversas"

type Cliente = Awaited<ReturnType<typeof sessaoAtual>>["supabase"]

/**
 * Atendente só transfere para quem divide time com ele. Admin e gerente
 * transferem para qualquer atendente do workspace.
 */
async function atendentesParaTransferir(
  supabase: Cliente,
  userId: string
): Promise<Array<{ id: string; nome: string }>> {
  const { data: userTeamsRows } = await supabase
    .from("user_teams")
    .select("team_id")
    .eq("user_id", userId)

  const teamIds = (userTeamsRows ?? []).map((r) => r.team_id)
  if (teamIds.length === 0) return []

  const { data: memberRows } = await supabase
    .from("user_teams")
    .select("user_id, profile:profiles!user_id(id, name)")
    .in("team_id", teamIds)
    .neq("user_id", userId)

  type MemberRow = { user_id: string; profile: { id: string; name: string | null } | null }
  const seen = new Set<string>()
  const lista: Array<{ id: string; nome: string }> = []
  for (const row of (memberRows ?? []) as unknown as MemberRow[]) {
    if (row.profile && !seen.has(row.profile.id)) {
      seen.add(row.profile.id)
      lista.push({ id: row.profile.id, nome: row.profile.name ?? "" })
    }
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome))
}

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ conversa?: string }> }) {
  // `searchParams` do Next não é uma Promise comum: aguardado à parte, como antes.
  const { conversa: conversaInicialId } = await searchParams
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) redirect("/login")

  const escopo = { workspaceId: perfil.workspace_id, papel: perfil.role, userId: user.id }

  // B10-04: nada aqui depende de nada; tudo sai de uma vez.
  const [atendentesRows, atendentesTransferirCalc, labelsRows, quickRepliesRows, conversas, conversaDaUrl] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name")
        .eq("workspace_id", perfil.workspace_id)
        .order("name", { ascending: true }),
      perfil.role === "atendente" ? atendentesParaTransferir(supabase, user.id) : null,
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
      listarConversas(supabase, { ...escopo, limite: TAMANHO_PAGINA_CONVERSAS }),
      conversaInicialId ? listarConversas(supabase, { ...escopo, conversaId: conversaInicialId }) : null,
    ])

  const atendentes = (atendentesRows.data ?? []).map((p) => ({ id: p.id, nome: p.name ?? "" }))
  const atendentesTransferir = atendentesTransferirCalc ?? atendentes

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

  // A conversa pedida na URL entra na lista mesmo fora da primeira página.
  const extra = conversaDaUrl?.[0]
  const conversasIniciais =
    extra && !conversas.some((c) => c.id === extra.id) ? [...conversas, extra] : conversas

  return (
    <ChatLayout
      conversas={conversasIniciais}
      temMaisConversas={conversas.length === TAMANHO_PAGINA_CONVERSAS}
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
