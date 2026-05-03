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

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, name, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) redirect("/login")

  let query = supabase
    .from("conversations")
    .select("id, status, assigned_to, unread_count, last_message_text, last_message_at, created_at, contact:contacts(name, phone_number), assignee:profiles!assigned_to(name)")
    .eq("workspace_id", perfil.workspace_id)
    .order("last_message_at", { ascending: false })

  if (perfil.role === "atendente") {
    query = query.eq("assigned_to", user.id)
  }

  const { data: rows } = await query

  type ConversationRow = {
    id: string
    status: string
    unread_count: number
    last_message_text: string
    last_message_at: string
    created_at: string
    contact: { name: string | null; phone_number: string } | null
    assignee: { name: string } | null
  }

  const conversas: Conversa[] = ((rows ?? []) as unknown as ConversationRow[]).map((c) => ({
    id: c.id,
    contato: {
      nome: c.contact?.name ?? null,
      telefone: c.contact?.phone_number ?? "",
    },
    ultimaMensagem: {
      texto: c.last_message_text,
      horario: formatHorario(c.last_message_at),
    },
    naoLidas: c.unread_count,
    status: c.status as StatusConversa,
    etiquetas: [],
    atribuidaA: c.assignee?.name ?? null,
    dataPrimeiroContato: new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
  }))

  return (
    <ChatLayout
      conversas={conversas}
      papel={perfil.role}
      nomeUsuario={perfil.name}
    />
  )
}
