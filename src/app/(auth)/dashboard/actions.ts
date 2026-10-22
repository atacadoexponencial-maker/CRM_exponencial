"use server"

import { sessaoAtual } from "@/lib/sessao"
import {
  calcularMetricas,
  calcularPerformanceVendedores,
  compraEhDoAtendente,
  rangeDoPeriodo,
  type CardRow,
  type FiltroDashboard,
  type HistoryRow,
  type MetricasDashboard,
  type PerformanceVendedor,
  type PurchaseRow,
} from "@/lib/metricas-dashboard"

import {
  calcularVariacoes,
  contarCardsPorEtapa,
  filtrarParaHoje,
  rangeAnterior,
  type EtapaComQuantidade,
  type VariacoesDashboard,
} from "@/lib/painel-dashboard"
import { ETAPAS_ENTRADA } from "@/app/(auth)/pipeline/mock-pipeline"
import { listarMinhaAgenda, type ItemAgenda } from "@/app/(auth)/agenda/actions"

export type { FiltroDashboard, MetricasDashboard, PerformanceVendedor, PeriodoKey } from "@/lib/metricas-dashboard"
export type { EtapaComQuantidade, Variacao, VariacoesDashboard } from "@/lib/painel-dashboard"

async function carregarDados(filtro: FiltroDashboard) {
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil) return null

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
      // B13-03: compra de contato na lixeira não conta; volta ao restaurar.
      // B30-03: atendente da venda, para a performance e o filtro por atendente.
      .select("contact_id, data, valor, atendente_id, contato:contacts!inner(excluido_em)")
      .eq("workspace_id", perfil.workspace_id)
      .is("contato.excluido_em", null),
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

  // Com filtro de atendente: compras dele e, das sem atendente, as dos contatos dele (B30-03).
  let purchases = (purchasesData ?? []) as PurchaseRow[]
  if (atendenteId) {
    const contatosDoAtendente = new Set(cards.map((c) => c.contact_id).filter(Boolean))
    purchases = purchases.filter((p) => compraEhDoAtendente(p, atendenteId, contatosDoAtendente))
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
  const { supabase, user, perfil } = await sessaoAtual()
  if (!user || !perfil || !["admin", "gerente"].includes(perfil.role)) return null

  // B10-05: dados e atendentes não dependem um do outro.
  const [dados, { data: atendentesData }] = await Promise.all([
    carregarDados({ ...filtro, atendenteId: null }),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("workspace_id", perfil.workspace_id)
      .eq("status", "active")
      .order("name"),
  ])
  if (!dados) return null

  const atendentes = (atendentesData ?? []).map((a) => ({ id: a.id as string, nome: a.name as string }))

  return calcularPerformanceVendedores(
    atendentes,
    dados.cards,
    dados.history,
    dados.purchases,
    rangeDoPeriodo(filtro)
  )
}

// ── B36-04: blocos novos do Dashboard ─────────────────────────────────────────

export type PainelDashboard = {
  metricas: MetricasDashboard
  variacoes: VariacoesDashboard
  funilEntrada: EtapaComQuantidade[]
}

/**
 * Métricas do período, a variação sobre o período anterior de mesmo tamanho e o
 * funil de Entrada por etapa, de uma leitura só. O filtro de atendente vale para
 * tudo; o Atendente vê só o que é dele.
 */
export async function buscarPainelDashboard(filtro: FiltroDashboard): Promise<PainelDashboard | null> {
  const dados = await carregarDados(filtro)
  if (!dados) return null

  const range = rangeDoPeriodo(filtro)
  const metricas = calcularMetricas(dados.cards, dados.history, dados.purchases, range)
  const anterior = calcularMetricas(dados.cards, dados.history, dados.purchases, rangeAnterior(range))
  return {
    metricas,
    variacoes: calcularVariacoes(metricas, anterior),
    funilEntrada: contarCardsPorEtapa(dados.cards, ETAPAS_ENTRADA, "entrada"),
  }
}

export type TarefaDeHoje = ItemAgenda & { atrasado: boolean }

/** "Para hoje": as tarefas da Agenda de quem está logado, atrasadas e do dia. */
export async function listarParaHoje(): Promise<TarefaDeHoje[]> {
  return filtrarParaHoje(await listarMinhaAgenda())
}

export type ConversaEsperando = {
  conversaId: string
  contatoNome: string
  trecho: string
  desde: string
  funil: "entrada" | "recompra" | null
}

/**
 * "Esperando resposta": conversas abertas em que o cliente mandou a última
 * mensagem. A permissão é a do Chat (a função do banco roda com a de quem chama).
 */
export async function listarEsperandoResposta(): Promise<{ conversas: ConversaEsperando[]; total: number }> {
  const { supabase, user } = await sessaoAtual()
  if (!user) return { conversas: [], total: 0 }

  type Linha = { conversa_id: string; contato_nome: string | null; telefone: string | null; trecho: string | null; tipo: string | null; desde: string; funil: string | null }
  const { data } = await supabase.rpc("conversas_esperando_resposta", { p_limite: 50 })
  const linhas = (data ?? []) as Linha[]
  return {
    total: linhas.length,
    conversas: linhas.slice(0, 5).map((l) => ({
      conversaId: l.conversa_id,
      contatoNome: l.contato_nome || l.telefone || "—",
      trecho: l.tipo === "texto" || l.tipo === "text" ? (l.trecho ?? "") : `[${l.tipo}] ${l.trecho ?? ""}`.trim(),
      desde: l.desde,
      funil: l.funil === "entrada" || l.funil === "recompra" ? l.funil : null,
    })),
  }
}
