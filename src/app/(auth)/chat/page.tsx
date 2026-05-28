import { redirect } from "next/navigation"
import { createClient } from "@/integrations/supabase/server"
import { ChatLayout } from "./components/chat-layout"
import type { Conversa, StatusConversa } from "./mock-conversas"

function formatHorario(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Ontem"
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  if (diffDays < 7) return weekdays[date.getDay()]
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

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

  let query = supabase
    .from("conversations")
    .select("id, status, assigned_to, unread_count, last_message_text, last_message_at, created_at, contact_id, contact:contacts(name, phone_number), assignee:profiles!assigned_to(name), conversation_labels(label_id, labels(id, name, color))")
    .eq("workspace_id", perfil.workspace_id)
    .order("last_message_at", { ascending: false })

  if (perfil.role === "atendente") {
    query = query.eq("assigned_to", user.id)
  }

  const { data: rows } = await query

  type LabelRow = { id: string; name: string; color: string } | null
  type ConvLabelRow = { label_id: string; labels: LabelRow }
  type ConversationRow = {
    id: string
    status: string
    unread_count: number
    last_message_text: string
    last_message_at: string
    created_at: string
    contact_id: string | null
    contact: { name: string | null; phone_number: string } | null
    assignee: { name: string } | null
    conversation_labels: ConvLabelRow[]
  }

  const conversas: Conversa[] = ((rows ?? []) as unknown as ConversationRow[]).map((c) => ({
    id: c.id,
    contato: {
      nome: c.contact?.name ?? null,
      telefone: c.contact?.phone_number ?? "",
      contactId: c.contact_id ?? null,
    },
    ultimaMensagem: {
      texto: c.last_message_text,
      horario: formatHorario(c.last_message_at),
    },
    naoLidas: c.unread_count,
    status: c.status as StatusConversa,
    etiquetas: (c.conversation_labels ?? [])
      .filter((cl) => cl.labels)
      .map((cl) => ({ id: cl.labels!.id, nome: cl.labels!.name, cor: cl.labels!.color })),
    atribuidaA: c.assignee?.name ?? null,
    dataPrimeiroContato: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
  }))

  return (
    <ChatLayout
      conversas={conversas}
      papel={perfil.role}
      nomeUsuario={perfil.name}
      workspaceId={perfil.workspace_id}
      userId={user.id}
      atendentes={atendentes}
      atendentesTransferir={atendentesTransferir}
      etiquetasDisponiveis={etiquetasDisponiveis}
      mensagensRapidas={mensagensRapidas}
      conversaInicialId={conversaInicialId ?? null}
    />
  )
}
