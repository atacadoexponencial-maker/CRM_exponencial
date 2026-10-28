// Cálculo puro das métricas do Dashboard — sem acesso a banco, para ser
// testável. O carregamento dos dados fica em src/app/(auth)/dashboard/actions.ts.

import { diaNoFuso, instanteNoFuso } from "@/lib/datas"

export type PeriodoKey = "7d" | "30d" | "90d" | "mes" | "trimestre" | "custom"

export type FiltroDashboard = {
  periodo: PeriodoKey
  inicio?: string // ISO yyyy-mm-dd, apenas para periodo = custom
  fim?: string
  atendenteId?: string | null
  /** B38-07: filtro por um campo personalizado. */
  campo?: import("@/lib/filtro-por-campo").FiltroPorCampo | null
}

export type MetricasDashboard = {
  entrada: {
    novosLeads: number
    leadsAtivos: number
    leadsPorSemana: Array<{ label: string; valor: number }>
  }
  conversao: {
    taxaGeral: number | null // % de cards criados no período que chegaram em Ganho
    funil: Array<{ etapa: string; label: string; quantidade: number; percentualDaAnterior: number | null }>
  }
  recompra: {
    clientesAtivos: number
    taxaRecompra: number | null
    emRisco: number
    inativos: number
    perdidos: number
    distribuicao: Array<{ label: string; valor: number; cor: string }>
  }
  receita: {
    totalCompras: number
    quantidadeCompras: number
    ticketMedioPrimeiraCompra: number | null
    ticketMedioGeral: number | null
    percentualNovos: number | null // % do faturamento vindo de clientes novos no período
  }
  /** B48-10: começo e fim do período, em ISO, para a tela dizer de quando são os números. */
  periodo?: { inicio: string; fim: string }
}

export type PerformanceVendedor = {
  atendenteId: string
  nome: string
  leadsCriados: number
  convertidos: number
  taxaConversao: number | null
  clientesAtivos: number
  emRisco: number
  recompras: number
  ticketMedio: number | null
}

export type RangePeriodo = { inicio: Date; fim: Date }

/** Linha da performance para os cards sem atendente. */
export const SEM_ATENDENTE = "__sem_atendente__"

export type CardRow = {
  id: string
  contact_id: string | null
  etapa: string
  funil: string
  atendente_id: string | null
  created_at: string
}

export type HistoryRow = { card_id: string; para_etapa: string; created_at: string }

export type PurchaseRow = {
  contact_id: string
  data: string
  valor: number
  /** B30-03: atendente responsável pela venda. Nulo = segue o atendente do card do contato. */
  atendente_id?: string | null
}

/**
 * B45-04: a compra é do atendente quando o contato está na carteira dele
 * (`contatosDoAtendente`: os contatos de que ele é o dono), qualquer que seja o
 * vendedor registrado na venda (PER-B45-06). Mesma regra nos Relatórios, no
 * dashboard filtrado e na performance. Antes (B30-03) valia o vendedor da venda.
 */
export function compraEhDoAtendente(p: PurchaseRow, contatosDoAtendente: Set<string | null>): boolean {
  return contatosDoAtendente.has(p.contact_id)
}

const ETAPAS_FUNIL: Array<{ id: string; label: string }> = [
  { id: "lead", label: "Lead" },
  { id: "sondagem", label: "Sondagem" },
  { id: "catalogo_enviado", label: "Catálogo Enviado" },
  { id: "follow_catalogo", label: "Follow do Catálogo" },
  { id: "negociacao", label: "Negociação" },
  { id: "ganho", label: "Ganho" },
]

// Nutrição e Perdido não são degraus da conversão: o card nelas conta pelas etapas do histórico.
const ETAPA_GANHO_IDX = ETAPAS_FUNIL.length - 1

const ETAPAS_RECOMPRA_ATIVAS = ["onboarding", "reposicao", "ativos"]

/** Meia-noite e último instante de um dia de calendário (aaaa-mm-dd) no fuso. */
const comecoDoDia = (dia: string, fuso: string) => instanteNoFuso(dia, "00:00", fuso)
const fimDoDia = (dia: string, fuso: string) => new Date(instanteNoFuso(dia, "23:59:59", fuso).getTime() + 999)

/** O dia de calendário N dias antes (negativo: depois), sem passar por fuso. */
function diasAntesDe(dia: string, n: number): string {
  return new Date(Date.parse(`${dia}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)
}

export function rangeDoPeriodo(filtro: FiltroDashboard, fuso: string, agora = new Date()): RangePeriodo {
  // B32-01: o período vai até o FIM do dia de hoje, não até a hora atual. A compra
  // guarda só a data e é comparada como meio-dia; de manhã ela ficava de fora.
  // B48-14: "hoje" é o dia no fuso da empresa; antes era o do servidor, que é UTC
  // na Vercel, e o dia virava às 21h de Brasília.
  const hoje = diaNoFuso(agora, fuso)
  const fim = fimDoDia(hoje, fuso)
  // "Últimos N dias" começa à meia-noite, como o fim acaba à meia-noite: o período
  // não muda entre duas leituras do mesmo dia.
  const ultimosDias = (dias: number) => ({ inicio: comecoDoDia(diasAntesDe(hoje, dias), fuso), fim })

  switch (filtro.periodo) {
    case "7d":
      return ultimosDias(7)
    case "30d":
      return ultimosDias(30)
    case "90d":
      return ultimosDias(90)
    case "mes":
      return { inicio: comecoDoDia(`${hoje.slice(0, 8)}01`, fuso), fim }
    case "trimestre": {
      const mesInicioTrimestre = Math.floor((Number(hoje.slice(5, 7)) - 1) / 3) * 3 + 1
      return { inicio: comecoDoDia(`${hoje.slice(0, 5)}${String(mesInicioTrimestre).padStart(2, "0")}-01`, fuso), fim }
    }
    case "custom": {
      // QA M17 (06/10): só a data final valia nada, e inicial depois da final zerava
      // tudo em silêncio. Só a final: 30 dias até ela. Trocadas: vale a ordem certa.
      if (filtro.inicio || filtro.fim) {
        const ateDia = filtro.fim || hoje
        const deDia = filtro.inicio || diasAntesDe(ateDia, 30)
        const [primeiro, ultimo] = deDia > ateDia ? [ateDia, deDia] : [deDia, ateDia]
        return { inicio: comecoDoDia(primeiro, fuso), fim: instanteNoFuso(ultimo, "23:59:59", fuso) }
      }
      return ultimosDias(30)
    }
  }
  return { inicio: agora, fim }
}

export function calcularMetricas(
  cards: CardRow[],
  history: HistoryRow[],
  purchases: PurchaseRow[],
  range: RangePeriodo
): MetricasDashboard {
  const { inicio, fim } = range
  const noPeriodo = (iso: string) => {
    const d = new Date(iso)
    return d >= inicio && d <= fim
  }

  const entrada = cards.filter((c) => c.funil === "entrada")
  const recompra = cards.filter((c) => c.funil === "recompra")
  const historyPorCard = new Map<string, HistoryRow[]>()
  for (const h of history) {
    const lista = historyPorCard.get(h.card_id) ?? []
    lista.push(h)
    historyPorCard.set(h.card_id, lista)
  }

  // ── Entrada de Leads ──────────────────────────────────────────────
  const novosLeadsCards = entrada.filter((c) => noPeriodo(c.created_at))
  const leadsAtivos = entrada.filter((c) => c.etapa !== "ganho" && c.etapa !== "perdido").length

  // Buckets do período: por semana; acima de 26 semanas, por mês (QA baixos, 06/10:
  // 145 barras sem ano eram ilegíveis).
  const leadsPorSemana: Array<{ label: string; valor: number }> = []
  const cursor = new Date(inicio)
  cursor.setHours(0, 0, 0, 0)
  const porMes = (fim.getTime() - cursor.getTime()) / (7 * 86400000) > 26
  if (porMes) cursor.setDate(1)
  while (cursor <= fim) {
    const proximo = new Date(cursor)
    if (porMes) proximo.setMonth(cursor.getMonth() + 1)
    else proximo.setDate(cursor.getDate() + 7)
    const valor = novosLeadsCards.filter((c) => {
      const d = new Date(c.created_at)
      return d >= cursor && d < proximo
    }).length
    leadsPorSemana.push({
      // B48-01: as semanas começam à meia-noite do processo (UTC na Vercel); o
      // rótulo diz a data desse começo, no mesmo relógio da conta
      label: porMes
        ? cursor.toLocaleDateString("pt-BR", { timeZone: "UTC", month: "2-digit", year: "2-digit" })
        : cursor.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }),
      valor,
    })
    cursor.setTime(proximo.getTime())
  }

  // ── Conversão ─────────────────────────────────────────────────────
  const indiceEtapa = new Map(ETAPAS_FUNIL.map((e, i) => [e.id, i]))
  function atingiuEtapa(card: CardRow, etapaIdx: number): boolean {
    // Card em Perdido nunca conta como convertido, mesmo que já tenha passado por Ganho.
    if (card.etapa === "perdido" && etapaIdx === ETAPA_GANHO_IDX) return false
    const atual = indiceEtapa.get(card.etapa) ?? 0
    if (atual >= etapaIdx) return true
    return (historyPorCard.get(card.id) ?? []).some(
      (h) => (indiceEtapa.get(h.para_etapa) ?? -1) >= etapaIdx
    )
  }

  const baseConversao = novosLeadsCards
  const funil = ETAPAS_FUNIL.map((etapa, i) => {
    const quantidade = baseConversao.filter((c) => atingiuEtapa(c, i)).length
    return { etapa: etapa.id, label: etapa.label, quantidade }
  })
  const funilComPercentual = funil.map((f, i) => ({
    ...f,
    percentualDaAnterior:
      i === 0 ? null : funil[i - 1].quantidade > 0
        ? Math.round((f.quantidade / funil[i - 1].quantidade) * 100)
        : null,
  }))
  const convertidos = funil[funil.length - 1].quantidade
  const taxaGeral =
    baseConversao.length > 0 ? Math.round((convertidos / baseConversao.length) * 100) : null

  // ── Recompra ──────────────────────────────────────────────────────
  const clientesAtivos = recompra.filter((c) => ETAPAS_RECOMPRA_ATIVAS.includes(c.etapa)).length
  const emRisco = recompra.filter((c) => c.etapa === "ativos_ri").length
  const inativos = recompra.filter((c) => c.etapa === "inativos" || c.etapa === "inativos_rp").length
  const perdidos = recompra.filter((c) => c.etapa === "perdidos").length

  // Recompras no período = movimentações para "ativos" em cards de recompra (substitui a antiga etapa de recompra realizada)
  const idsRecompra = new Set(recompra.map((c) => c.id))
  const recomprasNoPeriodo = history.filter(
    (h) => idsRecompra.has(h.card_id) && h.para_etapa === "ativos" && noPeriodo(h.created_at)
  ).length
  // Aproximação: usa a base de clientes ativos atual como denominador
  const taxaRecompra =
    clientesAtivos > 0 ? Math.round((recomprasNoPeriodo / clientesAtivos) * 100) : null

  const distribuicao = [
    { label: "Ativos", valor: clientesAtivos, cor: "#22c55e" },
    { label: "Em Risco", valor: emRisco, cor: "#f59e0b" },
    { label: "Inativos", valor: inativos, cor: "#6b7280" },
    { label: "Perdidos", valor: perdidos, cor: "#ef4444" },
  ]

  // ── Receita ───────────────────────────────────────────────────────
  const dataCompra = (p: PurchaseRow) => new Date(p.data + "T12:00:00")
  const comprasNoPeriodo = purchases.filter((p) => dataCompra(p) >= inicio && dataCompra(p) <= fim)
  const totalCompras = comprasNoPeriodo.reduce((s, p) => s + Number(p.valor), 0)
  const ticketMedioGeral =
    comprasNoPeriodo.length > 0 ? totalCompras / comprasNoPeriodo.length : null

  // Primeira compra de cada contato (em toda a história)
  const primeiraCompraPorContato = new Map<string, PurchaseRow>()
  for (const p of purchases) {
    const atual = primeiraCompraPorContato.get(p.contact_id)
    if (!atual || dataCompra(p) < dataCompra(atual)) primeiraCompraPorContato.set(p.contact_id, p)
  }

  const primeirasComprasNoPeriodo = Array.from(primeiraCompraPorContato.values()).filter(
    (p) => dataCompra(p) >= inicio && dataCompra(p) <= fim
  )
  const ticketMedioPrimeiraCompra =
    primeirasComprasNoPeriodo.length > 0
      ? primeirasComprasNoPeriodo.reduce((s, p) => s + Number(p.valor), 0) / primeirasComprasNoPeriodo.length
      : null

  // Cliente "novo" = primeira compra dele aconteceu dentro do período
  const contatosNovos = new Set(primeirasComprasNoPeriodo.map((p) => p.contact_id))
  const faturamentoNovos = comprasNoPeriodo
    .filter((p) => contatosNovos.has(p.contact_id))
    .reduce((s, p) => s + Number(p.valor), 0)
  const percentualNovos =
    totalCompras > 0 ? Math.round((faturamentoNovos / totalCompras) * 100) : null

  return {
    periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    entrada: { novosLeads: novosLeadsCards.length, leadsAtivos, leadsPorSemana },
    conversao: { taxaGeral, funil: funilComPercentual },
    recompra: { clientesAtivos, taxaRecompra, emRisco, inativos, perdidos, distribuicao },
    receita: {
      totalCompras,
      quantidadeCompras: comprasNoPeriodo.length,
      ticketMedioPrimeiraCompra,
      ticketMedioGeral,
      percentualNovos,
    },
  }
}

export function calcularPerformanceVendedores(
  atendentes: Array<{ id: string; nome: string }>,
  cards: CardRow[],
  history: HistoryRow[],
  purchases: PurchaseRow[],
  range: RangePeriodo
): PerformanceVendedor[] {
  const { inicio, fim } = range
  const noPeriodo = (iso: string) => {
    const d = new Date(iso)
    return d >= inicio && d <= fim
  }
  const dataCompra = (p: PurchaseRow) => new Date(p.data + "T12:00:00")

  // QA baixos (06/10): o que não tem atendente também aparece, numa linha própria.
  const semAtendente = cards.some((c) => !c.atendente_id)
  const linhas = semAtendente ? [...atendentes, { id: SEM_ATENDENTE, nome: "Sem atendente" }] : atendentes

  return linhas.map((a) => {
    const cardsDoAtendente = cards.filter((c) => (c.atendente_id ?? SEM_ATENDENTE) === a.id)
    const entrada = cardsDoAtendente.filter((c) => c.funil === "entrada")
    const recompra = cardsDoAtendente.filter((c) => c.funil === "recompra")
    const idsRecompra = new Set(recompra.map((c) => c.id))

    const leadsCriados = entrada.filter((c) => noPeriodo(c.created_at)).length
    const convertidos = entrada.filter(
      (c) =>
        noPeriodo(c.created_at) &&
        c.etapa !== "perdido" &&
        (c.etapa === "ganho" ||
          history.some((h) => h.card_id === c.id && h.para_etapa === "ganho"))
    ).length
    const clientesAtivos = recompra.filter((c) => ETAPAS_RECOMPRA_ATIVAS.includes(c.etapa)).length
    const emRisco = recompra.filter((c) => c.etapa === "ativos_ri").length
    const recompras = history.filter(
      (h) => idsRecompra.has(h.card_id) && h.para_etapa === "ativos" && noPeriodo(h.created_at)
    ).length

    // B45-04: as compras dos contatos da carteira dele. Desde a B45-02, o atendente
    // dos cards é o dono do contato, então os contatos dos cards dele são a carteira.
    const contatos = new Set(cardsDoAtendente.map((c) => c.contact_id).filter(Boolean))
    const comprasDoAtendente = purchases.filter(
      (p) => compraEhDoAtendente(p, contatos) && dataCompra(p) >= inicio && dataCompra(p) <= fim
    )
    const ticketMedio =
      comprasDoAtendente.length > 0
        ? comprasDoAtendente.reduce((s, p) => s + Number(p.valor), 0) / comprasDoAtendente.length
        : null

    return {
      atendenteId: a.id,
      nome: a.nome,
      leadsCriados,
      convertidos,
      taxaConversao: leadsCriados > 0 ? Math.round((convertidos / leadsCriados) * 100) : null,
      clientesAtivos,
      emRisco,
      recompras,
      ticketMedio,
    }
  })
}
