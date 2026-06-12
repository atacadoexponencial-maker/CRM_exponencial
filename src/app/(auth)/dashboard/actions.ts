"use server"

import { createClient } from "@/integrations/supabase/server"
import {
  calcularMetricas,
  calcularPerformanceVendedores,
  rangeDoPeriodo,
  type CardRow,
  type FiltroDashboard,
  type HistoryRow,
  type MetricasDashboard,
  type PerformanceVendedor,
  type PurchaseRow,
} from "@/lib/metricas-dashboard"

export type { FiltroDashboard, MetricasDashboard, PerformanceVendedor, PeriodoKey } from "@/lib/metricas-dashboard"

async function carregarDados(filtro: FiltroDashboard) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return null

  // Atendente vê apenas as próprias métricas (o RLS de pipeline_cards já
  // restringe, mas forçamos o filtro para purchases e consistência)
  const atendenteId = perfil.role === "atendente" ? user.id : (filtro.atendenteId ?? null)

  let cardsQuery = supabase
    .from("pipeline_cards")
    .select("id, contact_id, etapa, funil, atendente_id, created_at")
    .eq("workspace_id", perfil.workspace_id)

  if (atendenteId) cardsQuery = cardsQuery.eq("atendente_id", atendenteId)

  const [{ data: cardsData }, { data: purchasesData }] = await Promise.all([
    cardsQuery,
    supabase
      .from("contact_purchases")
      .select("contact_id, data, valor")
      .eq("workspace_id", perfil.workspace_id),
  ])

  const cards = (cardsData ?? []) as CardRow[]

  const cardIds = cards.map((c) => c.id)
  let history: HistoryRow[] = []
  if (cardIds.length > 0) {
    const { data: historyData } = await supabase
      .from("pipeline_card_history")
      .select("card_id, para_etapa, created_at")
      .in("card_id", cardIds)
    history = (historyData ?? []) as HistoryRow[]
  }

  // Com filtro de atendente, considera só compras dos contatos daquele atendente
  let purchases = (purchasesData ?? []) as PurchaseRow[]
  if (atendenteId) {
    const contatosDoAtendente = new Set(cards.map((c) => c.contact_id).filter(Boolean))
    purchases = purchases.filter((p) => contatosDoAtendente.has(p.contact_id))
  }

  return { perfil, cards, history, purchases }
}

export async function buscarMetricasDashboard(filtro: FiltroDashboard): Promise<MetricasDashboard | null> {
  const dados = await carregarDados(filtro)
  if (!dados) return null

  return calcularMetricas(dados.cards, dados.history, dados.purchases, rangeDoPeriodo(filtro))
}

export async function buscarPerformanceVendedores(
  filtro: FiltroDashboard
): Promise<PerformanceVendedor[] | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil || !["admin", "gerente"].includes(perfil.role)) return null

  const dados = await carregarDados({ ...filtro, atendenteId: null })
  if (!dados) return null

  const { data: atendentesData } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", perfil.workspace_id)
    .eq("status", "active")
    .order("name")

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id as string, nome: a.name as string }))

  return calcularPerformanceVendedores(
    atendentes,
    dados.cards,
    dados.history,
    dados.purchases,
    rangeDoPeriodo(filtro)
  )
}
