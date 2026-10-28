"use server"

import { createClient } from "@/integrations/supabase/server"
import { sessaoAtual } from "@/lib/sessao"
import { escaparLike } from "@/lib/escapar-like"

export type ItemAgenda = {
  id: string
  origem: "sequencia" | "avulso" | "automacao"
  /** Nome da regra que criou o lembrete, quando a origem é automação (B28-01). */
  automacaoNome?: string | null
  contatoNome: string
  contatoId: string
  conversaId: string | null
  instrucao: string
  dueAt: string
  atrasado: boolean
  atendenteNome?: string
  atendenteId?: string
}

// Usuário e perfil resolvidos uma vez por requisição (B10-03).
async function perfilAtual() {
  return sessaoAtual()
}

type ReminderRow = {
  id: string
  origem: "sequencia" | "avulso" | "automacao"
  automacao_nome: string | null
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
    automacaoNome: r.automacao_nome,
    contatoNome: r.contacts?.name || r.contacts?.phone_number || "—",
    contatoId: r.contact_id,
    conversaId: conversaPorContato[r.contact_id] ?? null,
    instrucao: r.instrucao,
    dueAt: r.due_at,
    // QA M5 (06/10): mesma regra do selo do menu: a hora já passou.
    atrasado: new Date(r.due_at) < new Date(),
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
  const { supabase, user } = await perfilAtual()
  if (!user) return []

  const { data } = await supabase
    .from("reminders")
    .select("id, origem, automacao_nome, instrucao, due_at, atendente_id, contact_id, contacts(id, name, phone_number)")
    .eq("atendente_id", user.id)
    .eq("status", "pendente")
    .order("due_at")

  const rows = (data ?? []) as unknown as ReminderRow[]
  const conversas = await buscarConversas(supabase, rows.map((r) => r.contact_id))
  return rows.map((r) => mapItem(r, conversas))
}

/** B28-06: sem o quadro das sequências em andamento, que saíram. */
export async function listarAgendaEquipe(atendenteId?: string | null): Promise<{ itens: ItemAgenda[] } | null> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return null

  let query = supabase
    .from("reminders")
    .select("id, origem, automacao_nome, instrucao, due_at, atendente_id, contact_id, contacts(id, name, phone_number), profiles!atendente_id(name)")
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "pendente")
    .order("due_at")

  if (atendenteId) query = query.eq("atendente_id", atendenteId)

  const { data: remindersData } = await query

  const rows = (remindersData ?? []) as unknown as ReminderRow[]
  const conversas = await buscarConversas(supabase, rows.map((r) => r.contact_id))

  return { itens: rows.map((r) => mapItem(r, conversas)) }
}

export async function marcarLembreteFeito(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { data: reminder, error } = await supabase
    .from("reminders")
    .update({ status: "feito", done_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pendente")
    .select("id")
    .single()

  // B28-06: marcar feito não avança mais sequência nenhuma
  if (error || !reminder) return { erro: "Não foi possível marcar como feito" }
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

/**
 * Vencimento do follow-up a partir da data e da hora do formulário, no horário de
 * Brasília (QA M12, 06/10: a Vercel roda em UTC, e 09:00 viraria 06:00). Serve ao
 * criar e ao editar (B47-06).
 */
function lerVencimento(data: string, hora?: string): { dueAt: Date } | { erro: string } {
  if (!data) return { erro: "Escolha a data" }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Data inválida" }
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Hora inválida" }
  const dueAt = new Date(`${data}T${hora || "09:00"}:00-03:00`)
  if (Number.isNaN(dueAt.getTime())) return { erro: "Data inválida" }
  // QA baixos (06/10): follow-up no passado nasceria atrasado.
  if (dueAt.getTime() < Date.now() - 60_000) return { erro: "A data do follow-up já passou." }
  return { dueAt }
}

/** O contato existe, é da empresa e não está na lixeira (B13-03). */
async function contatoDaEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .is("excluido_em", null)
    .single()
  return !!contato && contato.workspace_id === workspaceId
}

export async function criarFollowUp(params: {
  contactId: string
  data: string // yyyy-mm-dd
  hora?: string // HH:mm opcional
  nota: string
}): Promise<{ erro?: string }> {
  const { supabase, user, perfil } = await perfilAtual()
  if (!user || !perfil) return { erro: "Não autenticado" }
  if (!params.contactId) return { erro: "Escolha o contato" }
  if (!params.nota.trim()) return { erro: "Escreva uma nota para o follow-up" }
  if (!params.data) return { erro: "Escolha a data" }

  // B13-03: contato na lixeira não recebe follow-up.
  if (!(await contatoDaEmpresa(supabase, params.contactId, perfil.workspace_id))) return { erro: "Contato não encontrado" }

  const vencimento = lerVencimento(params.data, params.hora)
  if ("erro" in vencimento) return vencimento
  const { dueAt } = vencimento

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

/**
 * B47-06: edita contato, data, hora e nota de um lembrete pendente. Quem pode é
 * quem já pode adiar (o RLS: Admin e Gerente na empresa toda, o atendente nos dele).
 */
export async function editarLembrete(
  id: string,
  params: { contactId: string; data: string; hora?: string; nota: string }
): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }
  if (!params.contactId) return { erro: "Escolha o contato" }
  if (!params.nota.trim()) return { erro: "Escreva uma nota para o follow-up" }
  const vencimento = lerVencimento(params.data, params.hora)
  if ("erro" in vencimento) return vencimento
  if (!(await contatoDaEmpresa(supabase, params.contactId, perfil.workspace_id))) return { erro: "Contato não encontrado" }

  const { data, error } = await supabase
    .from("reminders")
    .update({ contact_id: params.contactId, instrucao: params.nota.trim(), due_at: vencimento.dueAt.toISOString() })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle()
  if (error) return { erro: "Não foi possível salvar o follow-up" }
  if (!data) return { erro: "Este lembrete não existe mais ou não é seu." }
  return {}
}

/** B47-06: apaga o lembrete. O RLS decide quem pode (migration 20261027000020). */
export async function apagarLembrete(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { data, error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .select("id")
    .maybeSingle()
  if (error) return { erro: "Não foi possível apagar o lembrete" }
  if (!data) return { erro: "Este lembrete não existe mais ou não é seu." }
  return {}
}

/** B47-06: o "Desfazer" do Feito volta o lembrete para pendente, com a mesma data. */
export async function desfazerFeito(id: string): Promise<{ erro?: string }> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return { erro: "Não autenticado" }

  const { data, error } = await supabase
    .from("reminders")
    .update({ status: "pendente", done_at: null })
    .eq("id", id)
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "feito")
    .select("id")
    .maybeSingle()
  if (error || !data) return { erro: "Não foi possível desfazer" }
  return {}
}

export async function buscarContatosParaFollowUp(termo: string): Promise<Array<{ id: string; nome: string }>> {
  const { supabase, perfil } = await perfilAtual()
  if (!perfil) return []

  const base = () =>
    supabase
      .from("contacts")
      .select("id, name, phone_number")
      .eq("workspace_id", perfil.workspace_id)
      .is("excluido_em", null)
      .order("name")
      .limit(10)

  // B44-10: o termo vai como valor de filtro, não dentro de um "or" montado como texto:
  // vírgula, parênteses e aspas no nome quebravam o filtro. Nome e telefone viram
  // duas buscas simples, juntadas aqui.
  const limpo = termo.trim()
  const digitos = limpo.replace(/\D/g, "")
  const [porNome, porTelefone] = await Promise.all([
    limpo ? base().ilike("name", `%${escaparLike(limpo)}%`) : base(),
    digitos.length >= 3 ? base().ilike("phone_number", `%${digitos}%`) : Promise.resolve({ data: [] }),
  ])

  const vistos = new Set<string>()
  return [...(porNome.data ?? []), ...(porTelefone.data ?? [])]
    .filter((c) => (vistos.has(c.id) ? false : (vistos.add(c.id), true)))
    .sort((a, b) => (a.name || a.phone_number).localeCompare(b.name || b.phone_number, "pt-BR"))
    .slice(0, 10)
    .map((c) => ({ id: c.id, nome: c.name || c.phone_number }))
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
