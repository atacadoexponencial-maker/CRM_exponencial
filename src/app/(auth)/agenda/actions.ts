"use server"

import { createClient } from "@/integrations/supabase/server"
import { avancarAposLembrete, processarSequenciasPendentes } from "@/lib/sequencias"

export type ItemAgenda = {
  id: string
  origem: "sequencia" | "avulso"
  contatoNome: string
  contatoId: string
  conversaId: string | null
  instrucao: string
  dueAt: string
  atrasado: boolean
  atendenteNome?: string
  atendenteId?: string
}

export type SequenciaEmAndamento = {
  runId: string
  sequenciaNome: string
  contatoNome: string
  atendenteNome: string
  etapaAtual: number
  totalEtapas: number
  proximaExecucao: string | null
}

async function perfilAtual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, perfil: null }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  return { supabase, user, perfil }
}

type ReminderRow = {
  id: string
  origem: "sequencia" | "avulso"
  instrucao: string
  due_at: string
  atendente_id: string
  contact_id: string
  contacts: { id: string; name: string | null; phone_number: string } | null
  profiles: { name: string } | null
}

function mapItem(r: ReminderRow, conversaPorContato: Record<string, string>): ItemAgenda {
  return {
    id: r.id,
    origem: r.origem,
    contatoNome: r.contacts?.name ?? r.contacts?.phone_number ?? "—",
    contatoId: r.contact_id,
    conversaId: conversaPorContato[r.contact_id] ?? null,
    instrucao: r.instrucao,
    dueAt: r.due_at,
    atrasado: new Date(r.due_at) < new Date(new Date().toDateString()),
    atendenteNome: r.profiles?.name,
    atendenteId: r.atendente_id,
  }
}

async function buscarConversas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactIds: string[]
): Promise<Record<string, string>> {
  if (contactIds.length === 0) return {}
  const { data } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .in("contact_id", contactIds)
    .order("last_message_at", { ascending: false })

  const mapa: Record<string, string> = {}
  for (const c of data ?? []) {
    if (c.contact_id && !mapa[c.contact_id]) mapa[c.contact_id] = c.id
  }
  return mapa
}

export async function listarMinhaAgenda(): Promise<ItemAgenda[]> {
  // Processa etapas vencidas de forma oportunista (complementa o cron diário)
  await processarSequenciasPendentes().catch(() => {})

  const { supabase, user } = await perfilAtual()
  if (!user) return []

  const { data } = await supabase
    .from("reminders")
    .select("id, origem, instrucao, due_at, atendente_id, contact_id, contacts(id, name, phone_number)")
    .eq("atendente_id", user.id)
    .eq("status", "pendente")
    .order("due_at")

  const rows = (data ?? []) as unknown as ReminderRow[]
  const conversas = await buscarConversas(supabase, rows.map((r) => r.contact_id))
  return rows.map((r) => mapItem(r, conversas))
}

export async function listarAgendaEquipe(atendenteId?: string | null): Promise<{
  itens: ItemAgenda[]
  sequencias: SequenciaEmAndamento[]
} | null> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return null

  let query = supabase
    .from("reminders")
    .select("id, origem, instrucao, due_at, atendente_id, contact_id, contacts(id, name, phone_number), profiles!atendente_id(name)")
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "pendente")
    .order("due_at")

  if (atendenteId) query = query.eq("atendente_id", atendenteId)

  const [{ data: remindersData }, { data: runsData }] = await Promise.all([
    query,
    supabase
      .from("sequence_runs")
      .select(
        "id, etapa_atual, proxima_execucao, atendente_id, contacts(name, phone_number), profiles!atendente_id(name), sequences(nome, sequence_steps(id))"
      )
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "em_andamento")
      .order("created_at", { ascending: false }),
  ])

  const rows = (remindersData ?? []) as unknown as ReminderRow[]
  const conversas = await buscarConversas(supabase, rows.map((r) => r.contact_id))

  type RunRow = {
    id: string
    etapa_atual: number
    proxima_execucao: string | null
    atendente_id: string | null
    contacts: { name: string | null; phone_number: string } | null
    profiles: { name: string } | null
    sequences: { nome: string; sequence_steps: Array<{ id: string }> } | null
  }
  const runs = (runsData ?? []) as unknown as RunRow[]

  return {
    itens: rows.map((r) => mapItem(r, conversas)),
    sequencias: runs
      .filter((r) => !atendenteId || r.atendente_id === atendenteId)
      .map((r) => ({
        runId: r.id,
        sequenciaNome: r.sequences?.nome ?? "—",
        contatoNome: r.contacts?.name ?? r.contacts?.phone_number ?? "—",
        atendenteNome: r.profiles?.name ?? "—",
        etapaAtual: r.etapa_atual + 1,
        totalEtapas: r.sequences?.sequence_steps?.length ?? 0,
        proximaExecucao: r.proxima_execucao,
      })),
  }
}

export async function marcarLembreteFeito(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { data: reminder, error } = await supabase
    .from("reminders")
    .update({ status: "feito", done_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pendente")
    .select("sequence_run_id")
    .single()

  if (error || !reminder) return { erro: "Não foi possível marcar como feito" }

  // Agenda a próxima etapa da sequência (se houver)
  if (reminder.sequence_run_id) {
    await avancarAposLembrete(reminder.sequence_run_id)
  }

  return {}
}

export async function adiarLembrete(id: string, dias: number): Promise<{ erro?: string }> {
  if (![1, 3, 7].includes(dias)) return { erro: "Prazo inválido" }

  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const novaData = new Date()
  novaData.setDate(novaData.getDate() + dias)

  const { error } = await supabase
    .from("reminders")
    .update({ due_at: novaData.toISOString() })
    .eq("id", id)
    .eq("status", "pendente")

  if (error) return { erro: "Não foi possível adiar o lembrete" }
  return {}
}

export async function reatribuirLembrete(id: string, atendenteId: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return { erro: "Sem permissão" }

  const { error } = await supabase
    .from("reminders")
    .update({ atendente_id: atendenteId })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)

  if (error) return { erro: "Não foi possível reatribuir" }
  return {}
}

export async function criarFollowUp(params: {
  contactId: string
  data: string // yyyy-mm-dd
  hora?: string // HH:mm opcional
  nota: string
}): Promise<{ erro?: string }> {
  const { supabase, user, perfil } = await perfilAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }
  if (!params.nota.trim()) return { erro: "Escreva uma nota para o follow-up" }
  if (!params.data) return { erro: "Escolha a data" }

  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", params.contactId)
    .single()

  if (!contato || contato.workspace_id !== perfil.workspace_id) return { erro: "Contato não encontrado" }

  const dueAt = new Date(`${params.data}T${params.hora || "09:00"}:00`)

  const { error } = await supabase.from("reminders").insert({
    workspace_id: perfil.workspace_id,
    contact_id: params.contactId,
    atendente_id: user.id,
    origem: "avulso",
    instrucao: params.nota.trim(),
    due_at: dueAt.toISOString(),
  })

  if (error) return { erro: "Não foi possível criar o follow-up" }
  return {}
}

export async function buscarContatosParaFollowUp(termo: string): Promise<Array<{ id: string; nome: string }>> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return []

  let query = supabase
    .from("contacts")
    .select("id, name, phone_number")
    .eq("workspace_id", perfil.workspace_id)
    .order("name")
    .limit(10)

  if (termo.trim()) {
    query = query.or(`name.ilike.%${termo.trim()}%,phone_number.ilike.%${termo.trim()}%`)
  }

  const { data } = await query
  return (data ?? []).map((c) => ({ id: c.id, nome: c.name ?? c.phone_number }))
}

export async function contarAtrasados(): Promise<number> {
  const { supabase, user } = await perfilAtual()
  if (!user) return 0

  const { count } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("atendente_id", user.id)
    .eq("status", "pendente")
    .lt("due_at", new Date().toISOString())

  return count ?? 0
}
