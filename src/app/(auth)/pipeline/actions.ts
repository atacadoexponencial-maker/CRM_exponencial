"use server"

import { createClient } from "@/integrations/supabase/server"
import { type CardLead, type EtapaExpansao, type CardCliente, type EtapaRetencao, type HistoricoEtapa, type NotaInterna } from "./mock-pipeline"

function calcularTempoNaEtapa(etapaChangedAt: string): string {
  const agora = new Date()
  const mudou = new Date(etapaChangedAt)
  const diffMs = agora.getTime() - mudou.getTime()
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return "Hoje"
  if (diffDias === 1) return "1 dia"
  if (diffDias < 7) return `${diffDias} dias`
  const semanas = Math.floor(diffDias / 7)
  if (semanas === 1) return "1 semana"
  if (semanas < 4) return `${semanas} semanas`
  const meses = Math.floor(diffDias / 30)
  if (meses === 1) return "1 mês"
  return `${meses} meses`
}

export async function listarAtendentes(): Promise<string[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile) return []

  const { data } = await supabase
    .from("profiles")
    .select("name")
    .eq("workspace_id", profile.workspace_id)
    .eq("status", "active")
    .order("name")

  return (data ?? []).map((p) => p.name as string)
}

export async function criarNovoLead(telefone: string, nome: string | null): Promise<void> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) throw new Error("Perfil não encontrado")
  if (!["admin", "gerente"].includes(profile.role)) throw new Error("Sem permissão para criar leads")

  const { data: contato, error: contatoError } = await supabase
    .from("contacts")
    .upsert(
      { workspace_id: profile.workspace_id, phone_number: telefone, name: nome ?? null },
      { onConflict: "workspace_id,phone_number", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  if (contatoError || !contato) throw new Error("Erro ao criar ou localizar contato")

  const { error: cardError } = await supabase
    .from("pipeline_cards")
    .insert({
      workspace_id: profile.workspace_id,
      contact_id: contato.id,
      etapa: "lead",
    })

  if (cardError) throw new Error("Erro ao criar card no pipeline")
}

export async function moverCard(cardId: string, novaEtapa: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error("Usuário não autenticado")

  const { data: card, error: cardError } = await supabase
    .from("pipeline_cards")
    .select("etapa")
    .eq("id", cardId)
    .single()

  if (cardError || !card) throw new Error("Card não encontrado")

  const { error: updateError } = await supabase
    .from("pipeline_cards")
    .update({ etapa: novaEtapa, etapa_changed_at: new Date().toISOString() })
    .eq("id", cardId)

  if (updateError) throw new Error("Erro ao mover card")

  await supabase
    .from("pipeline_card_history")
    .insert({
      card_id: cardId,
      de_etapa: card.etapa,
      para_etapa: novaEtapa,
      alterado_por: user.id,
    })
}

export async function buscarDadosPainel(cardId: string): Promise<{ historico: HistoricoEtapa[]; notas: NotaInterna[] }> {
  const supabase = await createClient()

  const [historicoResult, notasResult] = await Promise.all([
    supabase
      .from("pipeline_card_history")
      .select(`
        para_etapa,
        created_at,
        alterado_por:profiles!alterado_por (name)
      `)
      .eq("card_id", cardId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pipeline_card_notes")
      .select(`
        id,
        texto,
        created_at,
        autor:profiles!autor_id (name)
      `)
      .eq("card_id", cardId)
      .order("created_at", { ascending: true }),
  ])

  const historico: HistoricoEtapa[] = (historicoResult.data ?? []).map((row) => ({
    etapa: row.para_etapa,
    data: new Date(row.created_at).toLocaleDateString("pt-BR"),
    responsavel: (row.alterado_por as unknown as { name: string } | null)?.name,
  }))

  const notas: NotaInterna[] = (notasResult.data ?? []).map((row) => ({
    id: row.id,
    autor: (row.autor as unknown as { name: string } | null)?.name ?? "Desconhecido",
    texto: row.texto,
    data: new Date(row.created_at).toLocaleDateString("pt-BR"),
  }))

  return { historico, notas }
}

export async function listarCardsExpansao(): Promise<CardLead[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select(`
      id,
      etapa,
      etapa_changed_at,
      atendente:profiles!atendente_id (name),
      contato:contacts!contact_id (name, phone_number),
      pipeline_card_labels (
        label:labels!label_id (id, name, color)
      )
    `)
    .eq("funil", "expansao")

  if (error) throw new Error("Erro ao carregar cards do pipeline")

  return (data ?? []).map((row) => ({
    id: row.id,
    etapa: row.etapa as EtapaExpansao,
    tempoNaEtapa: calcularTempoNaEtapa(row.etapa_changed_at),
    atendente: (row.atendente as unknown as { name: string } | null)?.name ?? null,
    contato: {
      nome: (row.contato as { name: string | null; phone_number: string }).name ?? "Sem nome",
      telefone: (row.contato as { name: string | null; phone_number: string }).phone_number,
    },
    etiquetas: (row.pipeline_card_labels as Array<{ label: { id: string; name: string; color: string } }>).map(
      ({ label }) => ({ id: label.id, nome: label.name, cor: label.color })
    ),
  }))
}

export async function listarCardsRetencao(): Promise<CardCliente[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pipeline_cards")
    .select(`
      id,
      etapa,
      etapa_changed_at,
      atendente:profiles!atendente_id (name),
      contato:contacts!contact_id (name, phone_number),
      pipeline_card_labels (
        label:labels!label_id (id, name, color)
      )
    `)
    .eq("funil", "retencao")

  if (error) throw new Error("Erro ao carregar cards do funil de retenção")

  return (data ?? []).map((row) => ({
    id: row.id,
    etapa: row.etapa as EtapaRetencao,
    tempoNaEtapa: calcularTempoNaEtapa(row.etapa_changed_at),
    atendente: (row.atendente as unknown as { name: string } | null)?.name ?? null,
    contato: {
      nome: (row.contato as { name: string | null; phone_number: string }).name ?? "Sem nome",
      telefone: (row.contato as { name: string | null; phone_number: string }).phone_number,
    },
    etiquetas: (row.pipeline_card_labels as Array<{ label: { id: string; name: string; color: string } }>).map(
      ({ label }) => ({ id: label.id, nome: label.name, cor: label.color })
    ),
  }))
}
