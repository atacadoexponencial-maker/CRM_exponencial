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
import { formatarDataCurta, formatarHoraDoDia } from "@/lib/datas"
import type { FunilDoCard } from "../components/dialogo-excluir-contato"
import type { ItemLixeira } from "./components/lista-lixeira"

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

// ── B13-04: a lixeira ─────────────────────────────────────────────────
//
// Quem vê: Admin e Gerente, tudo da empresa; Atendente, o que era dele — card em
// que é o responsável ou conversa atribuída a ele (a mesma regra de excluir). As
// políticas de leitura escondem esses cards e conversas de quem usa a sessão,
// então a conta é feita com o cliente de serviço, depois de saber o papel.

const PRAZO_DIAS = 30
const DIA_MS = 86_400_000
const SEM_PERMISSAO_LIXEIRA = "Você não pode alterar este contato."
const NAO_ESTA_MAIS = "Este contato não está mais na lixeira."

type Svc = ReturnType<typeof createServiceClient>

/** Dos contatos dados, os que o atendente considera "seus". */
async function contatosDoAtendente(svc: Svc, userId: string, contactIds: string[]): Promise<Set<string>> {
  if (contactIds.length === 0) return new Set()
  const [{ data: cards }, { data: conversas }] = await Promise.all([
    svc.from("pipeline_cards").select("contact_id").in("contact_id", contactIds).eq("atendente_id", userId),
    svc.from("conversations").select("contact_id").in("contact_id", contactIds).eq("assigned_to", userId),
  ])
  return new Set([...(cards ?? []), ...(conversas ?? [])].map((r) => r.contact_id as string))
}

/** Ids dos contatos na lixeira que o usuário vê. */
async function idsVisiveisNaLixeira(svc: Svc, perfil: PerfilDaSessao, userId: string): Promise<string[]> {
  const { data } = await svc
    .from("contacts")
    .select("id")
    .eq("workspace_id", perfil.workspace_id)
    .not("excluido_em", "is", null)
  const ids = (data ?? []).map((c) => c.id)
  if (perfil.role === "admin" || perfil.role === "gerente") return ids
  const meus = await contatosDoAtendente(svc, userId, ids)
  return ids.filter((id) => meus.has(id))
}

type NaLixeira = { id: string; excluido_em: string; excluidoPor: string | null }

/** Contato na lixeira que o usuário vê; "nao_esta" se já saiu dela; null se não é dele. */
async function contatoNaLixeiraVisivel(
  svc: Svc,
  perfil: PerfilDaSessao,
  userId: string,
  contactId: string
): Promise<NaLixeira | "nao_esta" | null> {
  const { data: contato } = await svc
    .from("contacts")
    .select("id, excluido_em, excluidor:profiles!contacts_excluido_por_fkey(name)")
    .eq("id", contactId)
    .eq("workspace_id", perfil.workspace_id)
    .maybeSingle()
  if (!contato) return null
  if (!contato.excluido_em) return "nao_esta"
  if (perfil.role !== "admin" && perfil.role !== "gerente") {
    const meus = await contatosDoAtendente(svc, userId, [contactId])
    if (!meus.has(contactId)) return null
  }
  const excluidor = contato.excluidor as unknown as { name: string } | null
  return { id: contato.id, excluido_em: contato.excluido_em, excluidoPor: excluidor?.name ?? null }
}

function diasRestantes(excluidoEm: string): number {
  const passados = Math.floor((Date.now() - new Date(excluidoEm).getTime()) / DIA_MS)
  return Math.max(0, PRAZO_DIAS - passados)
}

function quando(iso: string): string {
  return `${formatarDataCurta(iso)} às ${formatarHoraDoDia(iso)}`
}

const EXCLUIDOR_DESCONHECIDO = "alguém que saiu da equipe"

export async function listarLixeira(): Promise<ItemLixeira[]> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return []
  const svc = createServiceClient()
  const ids = await idsVisiveisNaLixeira(svc, perfil, user.id)
  if (ids.length === 0) return []

  const [{ data: contatos }, { data: cards }] = await Promise.all([
    svc
      .from("contacts")
      .select("id, name, phone_number, excluido_em, excluidor:profiles!contacts_excluido_por_fkey(name)")
      .in("id", ids)
      .order("excluido_em", { ascending: false }),
    svc.from("pipeline_cards").select("contact_id, funil").in("contact_id", ids),
  ])

  const funisPorContato = new Map<string, Set<string>>()
  for (const c of cards ?? []) {
    const atual = funisPorContato.get(c.contact_id) ?? new Set<string>()
    atual.add(c.funil)
    funisPorContato.set(c.contact_id, atual)
  }

  return (contatos ?? []).map((c) => {
    const excluidor = c.excluidor as unknown as { name: string } | null
    const excluidoEm = c.excluido_em as string
    return {
      id: c.id,
      nome: c.name,
      telefone: c.phone_number,
      funis: (["entrada", "recompra"] as FunilDoCard[]).filter((f) => funisPorContato.get(c.id)?.has(f)),
      excluidoPor: excluidor?.name ?? EXCLUIDOR_DESCONHECIDO,
      excluidoEm: quando(excluidoEm),
      diasRestantes: diasRestantes(excluidoEm),
    }
  })
}

export async function contarLixeira(): Promise<number> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return 0
  return (await idsVisiveisNaLixeira(createServiceClient(), perfil, user.id)).length
}

/** Para o perfil de um contato que está na lixeira. `null` se não está ou não é dele. */
export async function estadoNaLixeira(
  contactId: string
): Promise<{ excluidoPor: string; excluidoEm: string; diasRestantes: number } | null> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null
  const contato = await contatoNaLixeiraVisivel(createServiceClient(), perfil, user.id, contactId)
  if (!contato || contato === "nao_esta") return null
  return {
    excluidoPor: contato.excluidoPor ?? EXCLUIDOR_DESCONHECIDO,
    excluidoEm: quando(contato.excluido_em),
    diasRestantes: diasRestantes(contato.excluido_em),
  }
}

function revalidarTudo() {
  for (const p of ["/contatos", "/contatos/lixeira", "/pipeline", "/pipeline/recompra", "/chat", "/agenda", "/dashboard"]) {
    revalidatePath(p)
  }
}

export async function restaurarContato(contactId: string): Promise<{ ok: true } | { erro: string }> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO_LIXEIRA }
  const svc = createServiceClient()
  const contato = await contatoNaLixeiraVisivel(svc, perfil, user.id, contactId)
  if (contato === "nao_esta") return { erro: NAO_ESTA_MAIS }
  if (!contato) return { erro: SEM_PERMISSAO_LIXEIRA }

  // Cards, conversas, mensagens e lembretes voltam sozinhos: as políticas de
  // leitura só os escondiam porque o contato estava na lixeira.
  const { error } = await svc
    .from("contacts")
    .update({ excluido_em: null, excluido_por: null })
    .eq("id", contactId)
    .not("excluido_em", "is", null)
  if (error) return { erro: "Não foi possível restaurar. Tente de novo." }

  revalidarTudo()
  return { ok: true }
}

const PREFIXO_PUBLICO = "/storage/v1/object/public/chat-attachments/"

/** Caminhos no bucket dos arquivos de mídia das conversas do contato. */
async function arquivosDoContato(svc: Svc, workspaceId: string, contactId: string): Promise<string[]> {
  const { data: conversas } = await svc.from("conversations").select("id").eq("contact_id", contactId)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length === 0) return []
  const { data: mensagens } = await svc
    .from("messages")
    .select("content")
    .in("conversation_id", ids)
    .neq("type", "texto")
  const caminhos: string[] = []
  for (const m of mensagens ?? []) {
    const conteudo = m.content ?? ""
    const i = conteudo.indexOf(PREFIXO_PUBLICO)
    if (i < 0) continue
    const caminho = decodeURIComponent(conteudo.slice(i + PREFIXO_PUBLICO.length).split("?")[0])
    // Só arquivos da própria empresa, e nunca os de campanha (não são do contato).
    if (caminho.startsWith(`${workspaceId}/`) && !caminho.startsWith(`${workspaceId}/campanhas/`)) {
      caminhos.push(caminho)
    }
  }
  return caminhos
}

export async function apagarContatoDeVez(contactId: string): Promise<{ ok: true } | { erro: string }> {
  const { user, perfil } = await sessaoAtual()
  if (!user || !perfil) return { erro: SEM_PERMISSAO_LIXEIRA }
  const svc = createServiceClient()
  const contato = await contatoNaLixeiraVisivel(svc, perfil, user.id, contactId)
  if (contato === "nao_esta") return { erro: NAO_ESTA_MAIS }
  if (!contato) return { erro: SEM_PERMISSAO_LIXEIRA }

  // Arquivos primeiro: depois de apagar as mensagens não há mais como achá-los.
  // Falha aqui deixa arquivo órfão, nunca dado — segue para apagar os dados.
  const caminhos = await arquivosDoContato(svc, perfil.workspace_id, contactId)
  if (caminhos.length > 0) {
    await svc.storage.from("chat-attachments").remove(caminhos).catch(() => {})
  }

  const { data: apagou, error } = await svc.rpc("apagar_contato_de_vez", { p_contact_id: contactId })
  if (error) return { erro: "Não foi possível apagar. Tente de novo." }
  if (!apagou) return { erro: NAO_ESTA_MAIS }

  revalidarTudo()
  return { ok: true }
}
