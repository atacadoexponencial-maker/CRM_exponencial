// Cálculo puro das métricas do Dashboard — sem acesso a banco, para ser
// testável. O carregamento dos dados fica em src/app/(auth)/dashboard/actions.ts.

export type PeriodoKey = "7d" | "30d" | "90d" | "mes" | "trimestre" | "custom"

export type FiltroDashboard = {
  periodo: PeriodoKey
  inicio?: string // ISO yyyy-mm-dd, apenas para periodo = custom
  fim?: string
  atendenteId?: string | null
}

export type MetricasDashboard = {
  entrada: {
    novosLeads: number
    leadsAtivos: number
    leadsPorSemana: Array<{ label: string; valor: number }>
  }
  conversao: {
    taxaGeral: number | null // % de cards criados no período que chegaram a Primeira Compra
    funil: Array<{ etapa: string; label: string; quantidade: number; percentualDaAnterior: number | null }>
  }
  retencao: {
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

export type CardRow = {
  id: string
  contact_id: string | null
  etapa: string
  funil: string
  atendente_id: string | null
  created_at: string
}

export type HistoryRow = { card_id: string; para_etapa: string; created_at: string }

export type PurchaseRow = { contact_id: string; data: string; valor: number }

const ETAPAS_FUNIL: Array<{ id: string; label: string }> = [
  { id: "lead", label: "Lead" },
  { id: "em_qualificacao", label: "Em Qualificação" },
  { id: "catalogo_enviado", label: "Catálogo Enviado" },
  { id: "em_negociacao", label: "Em Negociação" },
  { id: "primeira_compra", label: "Primeira Compra" },
]

const ETAPAS_RETENCAO_ATIVAS = ["em_onboarding", "cliente_ativo", "aguardando_recompra", "recompra_realizada"]

export function rangeDoPeriodo(filtro: FiltroDashboard, agora = new Date()): RangePeriodo {
  const fim = new Date(agora)
  const inicio = new Date(agora)

  switch (filtro.periodo) {
    case "7d":
      inicio.setDate(fim.getDate() - 7)
      break
    case "30d":
      inicio.setDate(fim.getDate() - 30)
      break
    case "90d":
      inicio.setDate(fim.getDate() - 90)
      break
    case "mes":
      inicio.setDate(1)
      inicio.setHours(0, 0, 0, 0)
      break
    case "trimestre": {
      const mesInicioTrimestre = Math.floor(fim.getMonth() / 3) * 3
      inicio.setMonth(mesInicioTrimestre, 1)
      inicio.setHours(0, 0, 0, 0)
      break
    }
    case "custom": {
      if (filtro.inicio) return {
        inicio: new Date(filtro.inicio + "T00:00:00"),
        fim: filtro.fim ? new Date(filtro.fim + "T23:59:59") : fim,
      }
      inicio.setDate(fim.getDate() - 30)
      break
    }
  }
  return { inicio, fim }
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

  const expansao = cards.filter((c) => c.funil === "expansao")
  const retencao = cards.filter((c) => c.funil === "retencao")
  const historyPorCard = new Map<string, HistoryRow[]>()
  for (const h of history) {
    const lista = historyPorCard.get(h.card_id) ?? []
    lista.push(h)
    historyPorCard.set(h.card_id, lista)
  }

  // ── Entrada de Leads ──────────────────────────────────────────────
  const novosLeadsCards = expansao.filter((c) => noPeriodo(c.created_at))
  const leadsAtivos = expansao.filter((c) => c.etapa !== "primeira_compra").length

  // Buckets semanais do período
  const leadsPorSemana: Array<{ label: string; valor: number }> = []
  const cursor = new Date(inicio)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= fim) {
    const fimSemana = new Date(cursor)
    fimSemana.setDate(cursor.getDate() + 7)
    const valor = novosLeadsCards.filter((c) => {
      const d = new Date(c.created_at)
      return d >= cursor && d < fimSemana
    }).length
    leadsPorSemana.push({
      label: cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      valor,
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  // ── Conversão ─────────────────────────────────────────────────────
  const indiceEtapa = new Map(ETAPAS_FUNIL.map((e, i) => [e.id, i]))
  function atingiuEtapa(card: CardRow, etapaIdx: number): boolean {
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

  // ── Retenção ──────────────────────────────────────────────────────
  const clientesAtivos = retencao.filter((c) => ETAPAS_RETENCAO_ATIVAS.includes(c.etapa)).length
  const emRisco = retencao.filter((c) => c.etapa === "em_risco").length
  const inativos = retencao.filter((c) => c.etapa === "inativo").length
  const perdidos = retencao.filter((c) => c.etapa === "perdido").length

  // Recompras no período = movimentações para "recompra_realizada" em cards de retenção
  const idsRetencao = new Set(retencao.map((c) => c.id))
  const recomprasNoPeriodo = history.filter(
    (h) => idsRetencao.has(h.card_id) && h.para_etapa === "recompra_realizada" && noPeriodo(h.created_at)
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
    entrada: { novosLeads: novosLeadsCards.length, leadsAtivos, leadsPorSemana },
    conversao: { taxaGeral, funil: funilComPercentual },
    retencao: { clientesAtivos, taxaRecompra, emRisco, inativos, perdidos, distribuicao },
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

  return atendentes.map((a) => {
    const cardsDoAtendente = cards.filter((c) => c.atendente_id === a.id)
    const expansao = cardsDoAtendente.filter((c) => c.funil === "expansao")
    const retencao = cardsDoAtendente.filter((c) => c.funil === "retencao")
    const idsRetencao = new Set(retencao.map((c) => c.id))

    const leadsCriados = expansao.filter((c) => noPeriodo(c.created_at)).length
    const convertidos = expansao.filter(
      (c) =>
        noPeriodo(c.created_at) &&
        (c.etapa === "primeira_compra" ||
          history.some((h) => h.card_id === c.id && h.para_etapa === "primeira_compra"))
    ).length
    const clientesAtivos = retencao.filter((c) => ETAPAS_RETENCAO_ATIVAS.includes(c.etapa)).length
    const emRisco = retencao.filter((c) => c.etapa === "em_risco").length
    const recompras = history.filter(
      (h) => idsRetencao.has(h.card_id) && h.para_etapa === "recompra_realizada" && noPeriodo(h.created_at)
    ).length

    const contatos = new Set(cardsDoAtendente.map((c) => c.contact_id).filter(Boolean))
    const comprasDoAtendente = purchases.filter(
      (p) => contatos.has(p.contact_id) && dataCompra(p) >= inicio && dataCompra(p) <= fim
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
