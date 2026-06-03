"use server"

import { createClient } from "@/integrations/supabase/server"
import type { Contato, ContatoPerfil, ClassificacaoContato, TipoContato, ICP } from "./mock-contatos"
import { calcularClassificacao } from "./classificacao"

const CONTACT_SELECT = "id, name, phone_number, classificacao, tipo, nicho, cidade, created_at, profiles!contacts_atendente_id_fkey(name)"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContato(c: any): Contato {
  return {
    id: c.id,
    nome: c.name ?? c.phone_number,
    telefone: c.phone_number,
    classificacao: (c.classificacao ?? "sem_historico") as ClassificacaoContato,
    tipo: (c.tipo ?? null) as TipoContato | null,
    nicho: c.nicho ?? null,
    cidade: c.cidade ?? null,
    atendente: c.profiles?.name ?? null,
    created_at: c.created_at,
  }
}

export async function verificarNumeroDuplicado(telefone: string): Promise<boolean> {
  if (!telefone.trim()) return false

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return false

  const { count } = await supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", profile.workspace_id)
    .eq("phone_number", telefone)

  return (count ?? 0) > 0
}

export async function criarContato(dados: {
  nome: string
  telefone: string
  tipo?: string | null
  nicho?: string | null
  cidade?: string | null
}): Promise<{ erro?: string; id?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para criar contatos" }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      workspace_id: profile.workspace_id,
      phone_number: dados.telefone,
      name: dados.nome,
      tipo: dados.tipo ?? null,
      nicho: dados.nicho ?? null,
      cidade: dados.cidade ?? null,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { erro: "Número já cadastrado neste workspace" }
    return { erro: "Erro ao criar contato. Tente novamente." }
  }

  return { id: data.id }
}

const ETAPA_RETENCAO_LABEL: Record<string, string> = {
  em_onboarding: "Em Onboarding",
  cliente_ativo: "Cliente Ativo",
  aguardando_recompra: "Aguardando Recompra",
  recompra_realizada: "Recompra Realizada",
  em_risco: "Em Risco",
  inativo: "Inativo",
  perdido: "Perdido",
}

const ETAPA_EXPANSAO_LABEL: Record<string, string> = {
  lead: "Lead",
  em_qualificacao: "Em Qualificação",
  catalogo_enviado: "Catálogo Enviado",
  em_negociacao: "Em Negociação",
  primeira_compra: "Primeira Compra",
}


const PERFIL_SELECT = "id, name, phone_number, tipo, nicho, cidade, icp, observacoes, created_at, atendente_id"

function formatarDataEvento(iso: string): string {
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, "0")
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const ano = d.getFullYear()
  const hora = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dia}/${mes}/${ano} ${hora}:${min}`
}

const ETAPA_LABEL_ALL: Record<string, string> = {
  lead: "Lead",
  em_qualificacao: "Em Qualificação",
  catalogo_enviado: "Catálogo Enviado",
  em_negociacao: "Em Negociação",
  primeira_compra: "Primeira Compra",
  em_onboarding: "Em Onboarding",
  cliente_ativo: "Cliente Ativo",
  aguardando_recompra: "Aguardando Recompra",
  recompra_realizada: "Recompra Realizada",
  em_risco: "Em Risco",
  inativo: "Inativo",
  perdido: "Perdido",
}

export async function buscarDadosContato(id: string): Promise<ContatoPerfil | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data }, { data: cardsData }, { data: tagsData }, { data: comprasData }, { data: conversacoesData }] = await Promise.all([
    supabase
      .from("contacts")
      .select(PERFIL_SELECT)
      .eq("id", id)
      .single(),
    supabase
      .from("pipeline_cards")
      .select("id, funil, etapa, created_at, atendente_id, profiles!pipeline_cards_atendente_id_fkey(name)")
      .eq("contact_id", id),
    supabase
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", id)
      .order("created_at"),
    supabase
      .from("contact_purchases")
      .select("id, data, valor, created_at")
      .eq("contact_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, created_at, assigned_to, profiles!assigned_to(name)")
      .eq("contact_id", id)
      .order("last_message_at", { ascending: false }),
  ])

  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = data as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCards = (cardsData ?? []) as Array<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawConversas = (conversacoesData ?? []) as Array<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCompras = (comprasData ?? []) as Array<any>

  const cards = rawCards.map((card) => ({
    funil: card.funil as "expansao" | "retencao",
    etapaLabel:
      card.funil === "retencao"
        ? (ETAPA_RETENCAO_LABEL[card.etapa] ?? card.etapa)
        : (ETAPA_EXPANSAO_LABEL[card.etapa] ?? card.etapa),
  }))

  // Segunda rodada: histórico e notas dos cards
  const cardIds = rawCards.map((card) => card.id as string)
  const [{ data: historyData }, { data: notesData }] = await Promise.all([
    cardIds.length > 0
      ? supabase
          .from("pipeline_card_history")
          .select("id, created_at, card_id, de_etapa, para_etapa, profiles!alterado_por(name)")
          .in("card_id", cardIds)
      : Promise.resolve({ data: [] }),
    cardIds.length > 0
      ? supabase
          .from("pipeline_card_notes")
          .select("id, created_at, texto, profiles!autor_id(name)")
          .in("card_id", cardIds)
      : Promise.resolve({ data: [] }),
  ])

  // Montar timeline
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type RawEvento = { id: string; created_at: string; tipo: string; descricao: string; responsavel: string }
  const eventos: RawEvento[] = []

  for (const conv of rawConversas) {
    eventos.push({
      id: conv.id,
      created_at: conv.created_at,
      tipo: "conversa_iniciada",
      descricao: "Nova conversa iniciada via WhatsApp",
      responsavel: conv.profiles?.name ?? "",
    })
  }

  for (const card of rawCards) {
    const funilLabel = card.funil === "retencao" ? "Retenção" : "Expansão"
    const etapaLabel = ETAPA_LABEL_ALL[card.etapa] ?? card.etapa
    eventos.push({
      id: card.id,
      created_at: card.created_at,
      tipo: "card_criado",
      descricao: `Card criado no Funil de ${funilLabel} — etapa: ${etapaLabel}`,
      responsavel: card.profiles?.name ?? "",
    })
  }

  for (const h of (historyData ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hh = h as any
    const de = hh.de_etapa ? (ETAPA_LABEL_ALL[hh.de_etapa] ?? hh.de_etapa) : null
    const para = ETAPA_LABEL_ALL[hh.para_etapa] ?? hh.para_etapa
    eventos.push({
      id: hh.id,
      created_at: hh.created_at,
      tipo: "mudanca_etapa",
      descricao: de ? `${de} → ${para}` : `Movido para ${para}`,
      responsavel: hh.profiles?.name ?? "",
    })
  }

  for (const n of (notesData ?? [])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nn = n as any
    eventos.push({
      id: nn.id,
      created_at: nn.created_at,
      tipo: "nota_interna",
      descricao: `"${nn.texto}"`,
      responsavel: nn.profiles?.name ?? "",
    })
  }

  for (const p of rawCompras) {
    const valor = Number(p.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    eventos.push({
      id: `purchase-${p.id}`,
      created_at: p.created_at,
      tipo: "compra_registrada",
      descricao: `Compra registrada — ${valor}`,
      responsavel: "",
    })
  }

  eventos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const timeline = eventos.map((e) => ({
    id: e.id,
    data: formatarDataEvento(e.created_at),
    tipo: e.tipo as import("./mock-contatos").TipoEvento,
    descricao: e.descricao,
    responsavel: e.responsavel,
  }))

  return {
    id: c.id,
    nome: c.name ?? c.phone_number,
    telefone: c.phone_number,
    classificacao: calcularClassificacao(rawCards),
    tipo: (c.tipo ?? null) as TipoContato | null,
    nicho: c.nicho ?? null,
    cidade: c.cidade ?? null,
    atendente: null,
    created_at: c.created_at,
    icp: (c.icp ?? null) as ICP | null,
    tags: (tagsData ?? []).map((t: { tag: string }) => t.tag),
    observacoes: c.observacoes ?? "",
    conversaId: rawConversas[0]?.id ?? null,
    cards,
    compras: rawCompras.map((p) => ({
      id: p.id,
      data: new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR"),
      valor: Number(p.valor),
    })),
    timeline,
  }
}

export async function atualizarDadosContato(
  id: string,
  dados: { nome: string; tipo?: string | null; nicho?: string | null; cidade?: string | null; icp?: string | null }
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para editar contatos" }

  const { error } = await supabase
    .from("contacts")
    .update({
      name: dados.nome,
      tipo: dados.tipo ?? null,
      nicho: dados.nicho ?? null,
      cidade: dados.cidade ?? null,
      icp: dados.icp ?? null,
    })
    .eq("id", id)

  if (error) return { erro: "Erro ao salvar. Tente novamente." }

  return {}
}

export async function listarContatos(): Promise<Contato[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return []

  if (profile.role === "admin" || profile.role === "gerente") {
    const { data } = await supabase
      .from("contacts")
      .select(CONTACT_SELECT)
      .eq("workspace_id", profile.workspace_id)
      .order("name")

    return (data ?? []).map(mapContato)
  }

  // Atendente: filtra por conversas e cards atribuídos
  const [{ data: convData }, { data: cardData }] = await Promise.all([
    supabase
      .from("conversations")
      .select("contact_id")
      .eq("assigned_to", user.id),
    supabase
      .from("pipeline_cards")
      .select("contact_id")
      .eq("atendente_id", user.id),
  ])

  const contactIds = Array.from(new Set([
    ...(convData ?? []).map((c) => c.contact_id as string),
    ...(cardData ?? []).map((c) => c.contact_id as string),
  ]))

  if (contactIds.length === 0) return []

  const { data } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .in("id", contactIds)
    .order("name")

  return (data ?? []).map(mapContato)
}

export async function adicionarTagContato(
  contactId: string,
  tag: string
): Promise<{ erro?: string }> {
  const tagNorm = tag.trim().toLowerCase()
  if (!tagNorm) return { erro: "Tag não pode ser vazia" }
  if (tagNorm.length > 50) return { erro: "Tag muito longa (máx. 50 caracteres)" }
  if (/\s/.test(tagNorm)) return { erro: "Tag não pode conter espaços" }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }

  // Verifica que o contato pertence ao workspace do usuário
  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  const { error } = await supabase
    .from("contact_tags")
    .insert({ contact_id: contactId, workspace_id: profile.workspace_id, tag: tagNorm })

  if (error) {
    if (error.code === "23505") return {}
    return { erro: "Erro ao adicionar tag. Tente novamente." }
  }

  return {}
}

export async function removerTagContato(
  contactId: string,
  tag: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { error } = await supabase
    .from("contact_tags")
    .delete()
    .eq("contact_id", contactId)
    .eq("tag", tag)

  if (error) return { erro: "Erro ao remover tag. Tente novamente." }

  return {}
}

export async function atualizarObservacoesContato(
  contactId: string,
  observacoes: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }

  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  const { error } = await supabase
    .from("contacts")
    .update({ observacoes: observacoes || null })
    .eq("id", contactId)

  if (error) return { erro: "Erro ao salvar. Tente novamente." }

  return {}
}

export async function registrarCompra(
  contactId: string,
  dados: { data: string; valor: number }
): Promise<{ erro?: string }> {
  if (!dados.valor || dados.valor <= 0) return { erro: "Valor deve ser maior que zero" }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { erro: "Perfil não encontrado" }
  if (profile.role === "atendente") return { erro: "Sem permissão para registrar compras" }

  const { data: contato } = await supabase
    .from("contacts")
    .select("workspace_id")
    .eq("id", contactId)
    .single()

  if (!contato || contato.workspace_id !== profile.workspace_id) {
    return { erro: "Contato não encontrado" }
  }

  const { error } = await supabase
    .from("contact_purchases")
    .insert({
      contact_id: contactId,
      workspace_id: profile.workspace_id,
      data: dados.data,
      valor: dados.valor,
    })

  if (error) return { erro: "Erro ao registrar compra. Tente novamente." }

  return {}
}
