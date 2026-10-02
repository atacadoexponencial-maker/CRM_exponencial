"use server"

// B13-02: mandar contato para a lixeira. Excluir pelo card leva o contato junto
// (decisão da Marcelle), então card e contato são a mesma exclusão.
//
// Quem pode: Admin e Gerente, qualquer contato da empresa; Atendente, só o que
// já vê — contato com conversa atribuída a ele ou card em que ele é o
// responsável (a mesma regra de `listarContatos`). A gravação usa o cliente de
// serviço depois da checagem, porque o banco só deixa Admin e Gerente alterar
// contatos.

import { revalidatePath } from "next/cache"
import { sessaoAtual, type PerfilDaSessao } from "@/lib/sessao"
import { createServiceClient } from "@/integrations/supabase/service"
import { transmitirContatoExcluido } from "@/lib/whatsapp/realtime"
import type { FunilDoCard } from "../components/dialogo-excluir-contato"

type Supabase = Awaited<ReturnType<typeof sessaoAtual>>["supabase"]

export type ResumoExclusao = {
  contactId: string
  nome: string | null
  telefone: string
  funis: FunilDoCard[]
  conversas: number
  mensagens: number
}

const SEM_PERMISSAO = "Você não pode excluir este contato."
const FALHOU = "Não foi possível excluir. Tente de novo."

/** Contato ativo da empresa que o usuário pode excluir, ou null. */
async function contatoExcluivel(
  supabase: Supabase,
  userId: string,
  perfil: PerfilDaSessao,
  contactId: string
): Promise<{ id: string; name: string | null; phone_number: string } | null> {
  const { data: contato } = await supabase
    .from("contacts")
    .select("id, name, phone_number")
    .eq("id", contactId)
    .eq("workspace_id", perfil.workspace_id)
    .is("excluido_em", null)
    .maybeSingle()
  if (!contato) return null

  if (perfil.role === "admin" || perfil.role === "gerente") return contato

  const [{ count: conversas }, { count: cards }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .eq("assigned_to", userId),
    supabase
      .from("pipeline_cards")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .eq("atendente_id", userId),
  ])
  return (conversas ?? 0) > 0 || (cards ?? 0) > 0 ? contato : null
}

/** O card só chega aqui se o usuário o enxerga (o banco já limita o atendente aos seus). */
async function contatoDoCard(supabase: Supabase, cardId: string): Promise<string | null> {
  const { data } = await supabase
    .from("pipeline_cards")
    .select("contact_id")
    .eq("id", cardId)
    .maybeSingle()
  return data?.contact_id ?? null
}

async function montarResumo(
  workspaceId: string,
  contato: { id: string; name: string | null; phone_number: string }
): Promise<ResumoExclusao> {
  // Cliente de serviço: o diálogo precisa contar tudo o que vai junto, inclusive
  // o card do outro funil que um atendente não enxerga.
  const svc = createServiceClient()
  const [{ data: cards }, { data: conversas }] = await Promise.all([
    svc.from("pipeline_cards").select("funil").eq("workspace_id", workspaceId).eq("contact_id", contato.id),
    svc.from("conversations").select("id").eq("workspace_id", workspaceId).eq("contact_id", contato.id),
  ])
  const idsConversas = (conversas ?? []).map((c) => c.id)
  let mensagens = 0
  if (idsConversas.length > 0) {
    const { count } = await svc
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", idsConversas)
    mensagens = count ?? 0
  }
  const funis = Array.from(new Set((cards ?? []).map((c) => c.funil as FunilDoCard)))
  return {
    contactId: contato.id,
    nome: contato.name,
    telefone: contato.phone_number,
    funis,
    conversas: idsConversas.length,
    mensagens,
  }
}

async function mandarParaLixeira(workspaceId: string, userId: string, contactId: string): Promise<boolean> {
  const svc = createServiceClient()
  const { error } = await svc
    .from("contacts")
    .update({ excluido_em: new Date().toISOString(), excluido_por: userId })
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .is("excluido_em", null)
  if (error) return false

  // B13-03: sequências em andamento são encerradas e não recomeçam ao restaurar
  // (premissa aprovada). Se falhar, o cron as cancela sem enviar nada.
  const agora = new Date().toISOString()
  await svc
    .from("sequence_runs")
    .update({ status: "cancelada", proxima_execucao: null, finished_at: agora })
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .eq("status", "em_andamento")

  try {
    await transmitirContatoExcluido(workspaceId, contactId)
  } catch {
    // Exclusão gravada; a caixa de entrada dos outros atualiza no próximo carregamento.
  }

  revalidatePath("/pipeline")
  revalidatePath("/pipeline/recompra")
  revalidatePath("/contatos")
  revalidatePath("/chat")
  return true
}

export async function resumoExclusaoContato(
  contactId: string
): Promise<{ resumo: ResumoExclusao } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO }
  const contato = await contatoExcluivel(supabase, user.id, perfil, contactId)
  if (!contato) return { erro: SEM_PERMISSAO }
  return { resumo: await montarResumo(perfil.workspace_id, contato) }
}

export async function resumoExclusaoPorCard(
  cardId: string
): Promise<{ resumo: ResumoExclusao } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO }
  const contactId = await contatoDoCard(supabase, cardId)
  if (!contactId) return { erro: SEM_PERMISSAO }
  const { data: contato } = await supabase
    .from("contacts")
    .select("id, name, phone_number")
    .eq("id", contactId)
    .is("excluido_em", null)
    .maybeSingle()
  if (!contato) return { erro: SEM_PERMISSAO }
  return { resumo: await montarResumo(perfil.workspace_id, contato) }
}

export async function excluirContato(contactId: string): Promise<{ ok: true } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO }

  const contato = await contatoExcluivel(supabase, user.id, perfil, contactId)
  if (!contato) {
    // Já na lixeira (dois cliques, duas abas): nada a fazer, e não é erro.
    const { data: jaExcluido } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("workspace_id", perfil.workspace_id)
      .not("excluido_em", "is", null)
      .maybeSingle()
    return jaExcluido ? { ok: true } : { erro: SEM_PERMISSAO }
  }

  return (await mandarParaLixeira(perfil.workspace_id, user.id, contato.id)) ? { ok: true } : { erro: FALHOU }
}

export async function excluirContatoPorCard(cardId: string): Promise<{ ok: true } | { erro: string }> {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO }

  const contactId = await contatoDoCard(supabase, cardId)
  // Card invisível: ou não é dele, ou o contato já foi para a lixeira.
  if (!contactId) return { erro: SEM_PERMISSAO }

  return (await mandarParaLixeira(perfil.workspace_id, user.id, contactId)) ? { ok: true } : { erro: FALHOU }
}
