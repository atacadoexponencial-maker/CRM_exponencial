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
 * B30-03: a compra é do atendente da venda; sem atendente, do atendente do card do
 * contato (`contatosDoAtendente`). Mesma regra no dashboard filtrado e na performance.
 */
export function compraEhDoAtendente(
  p: PurchaseRow,
  atendenteId: string,
  contatosDoAtendente: Set<string | null>
): boolean {
  if (p.atendente_id) return p.atendente_id === atendenteId
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

export function rangeDoPeriodo(filtro: FiltroDashboard, agora = new Date()): RangePeriodo {
  // B32-01: o período vai até o FIM do dia de hoje, não até a hora atual. A compra
  // guarda só a data e é comparada como meio-dia; de manhã ela ficava de fora.
  const fim = new Date(agora)
  fim.setHours(23, 59, 59, 999)
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
      // QA M17 (06/10): só a data final valia nada, e inicial depois da final zerava
      // tudo em silêncio. Só a final: 30 dias até ela. Trocadas: vale a ordem certa.
      if (filtro.inicio || filtro.fim) {
        let de = filtro.inicio ? new Date(filtro.inicio + "T00:00:00") : null
        let ate = filtro.fim ? new Date(filtro.fim + "T23:59:59") : fim
        if (!de) {
          de = new Date(ate)
          de.setDate(ate.getDate() - 30)
          de.setHours(0, 0, 0, 0)
        }
        if (de > ate) {
          const comeco = new Date(ate)
          comeco.setHours(0, 0, 0, 0)
          const final = new Date(de)
          final.setHours(23, 59, 59, 0)
          de = comeco
          ate = final
        }
        return { inicio: de, fim: ate }
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
      label: porMes
        ? cursor.toLocaleDateString("pt-BR", { month: "2-digit", year: "2-digit" })
        : cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
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

    const contatos = new Set(cardsDoAtendente.map((c) => c.contact_id).filter(Boolean))
    // B30-03: compra com atendente conta para ele; sem atendente, para o atendente do card.
    const comprasDoAtendente = purchases.filter(
      (p) => compraEhDoAtendente(p, a.id, contatos) && dataCompra(p) >= inicio && dataCompra(p) <= fim
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
