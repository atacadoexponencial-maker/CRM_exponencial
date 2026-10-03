// Testes unitários do cálculo de métricas do Dashboard (lógica pura).

import { describe, it, expect } from "vitest"
import {
  calcularMetricas,
  calcularPerformanceVendedores,
  rangeDoPeriodo,
  type CardRow,
  type HistoryRow,
  type PurchaseRow,
} from "@/lib/metricas-dashboard"

const range = {
  inicio: new Date("2026-06-01T00:00:00"),
  fim: new Date("2026-06-30T23:59:59"),
}

function card(parcial: Partial<CardRow> & { id: string }): CardRow {
  return {
    contact_id: `contato-${parcial.id}`,
    etapa: "lead",
    funil: "entrada",
    atendente_id: null,
    created_at: "2026-06-10T10:00:00Z",
    ...parcial,
  }
}

describe("calcularMetricas", () => {
  it("conta novos leads no período e leads ativos agora", () => {
    const cards = [
      card({ id: "1", created_at: "2026-06-05T10:00:00" }),
      card({ id: "2", created_at: "2026-06-20T10:00:00", etapa: "negociacao" }),
      card({ id: "3", created_at: "2026-05-01T10:00:00" }), // fora do período
      card({ id: "4", created_at: "2026-06-15T10:00:00", etapa: "ganho" }),
    ]

    const m = calcularMetricas(cards, [], [], range)

    expect(m.entrada.novosLeads).toBe(3) // 1, 2 e 4
    expect(m.entrada.leadsAtivos).toBe(3) // todos menos o que está em ganho
  })

  it("calcula taxa de conversão e funil de passagem", () => {
    const cards = [
      card({ id: "1", etapa: "ganho" }),
      card({ id: "2", etapa: "sondagem" }),
      card({ id: "3", etapa: "lead" }),
      card({ id: "4", etapa: "lead" }),
    ]

    const m = calcularMetricas(cards, [], [], range)

    expect(m.conversao.taxaGeral).toBe(25) // 1 de 4
    expect(m.conversao.funil[0].quantidade).toBe(4) // todos passaram por Lead
    expect(m.conversao.funil[1].quantidade).toBe(2) // 1 e 2
    expect(m.conversao.funil[5].quantidade).toBe(1) // Ganho
  })

  it("considera o histórico para cards que regrediram de etapa", () => {
    const cards = [card({ id: "1", etapa: "lead" })]
    const history: HistoryRow[] = [
      { card_id: "1", para_etapa: "negociacao", created_at: "2026-06-12T10:00:00" },
    ]

    const m = calcularMetricas(cards, history, [], range)

    expect(m.conversao.funil[4].quantidade).toBe(1) // atingiu Negociação via histórico
  })

  it("B14-02 — gráfico de conversão tem 6 degraus, com Follow do Catálogo e sem Nutrição e Perdido", () => {
    const m = calcularMetricas([card({ id: "1" })], [], [], range)
    expect(m.conversao.funil.map((f) => f.etapa)).toEqual([
      "lead", "sondagem", "catalogo_enviado", "follow_catalogo", "negociacao", "ganho",
    ])
  })

  it("B14-02 — card em Perdido não conta como lead ativo", () => {
    const cards = [
      card({ id: "1", etapa: "perdido" }),
      card({ id: "2", etapa: "nutricao" }),
      card({ id: "3", etapa: "follow_catalogo" }),
    ]
    const m = calcularMetricas(cards, [], [], range)
    expect(m.entrada.leadsAtivos).toBe(2) // Nutrição e Follow contam; Perdido não
  })

  it("B14-02 — card em Nutrição conta pelas etapas do histórico", () => {
    const cards = [card({ id: "1", etapa: "nutricao" })]
    const history: HistoryRow[] = [
      { card_id: "1", para_etapa: "negociacao", created_at: "2026-06-12T10:00:00" },
      { card_id: "1", para_etapa: "nutricao", created_at: "2026-06-14T10:00:00" },
    ]
    const m = calcularMetricas(cards, history, [], range)
    expect(m.conversao.funil[4].quantidade).toBe(1) // chegou em Negociação
    expect(m.conversao.funil[5].quantidade).toBe(0) // não chegou em Ganho
  })

  it("B14-02 — card que passou por Ganho e está em Perdido não conta como convertido", () => {
    const cards = [card({ id: "1", etapa: "perdido" })]
    const history: HistoryRow[] = [
      { card_id: "1", para_etapa: "negociacao", created_at: "2026-06-12T10:00:00" },
      { card_id: "1", para_etapa: "ganho", created_at: "2026-06-13T10:00:00" },
      { card_id: "1", para_etapa: "perdido", created_at: "2026-06-14T10:00:00" },
    ]
    const m = calcularMetricas(cards, history, [], range)
    expect(m.conversao.funil[4].quantidade).toBe(1) // os degraus anteriores contam
    expect(m.conversao.funil[5].quantidade).toBe(0)
    expect(m.conversao.taxaGeral).toBe(0)
  })

  it("calcula métricas de recompra e taxa de recompra", () => {
    const cards = [
      card({ id: "r1", funil: "recompra", etapa: "ativos" }),
      card({ id: "r2", funil: "recompra", etapa: "reposicao" }),
      card({ id: "r3", funil: "recompra", etapa: "ativos_ri" }),
      card({ id: "r4", funil: "recompra", etapa: "perdidos" }),
    ]
    const history: HistoryRow[] = [
      { card_id: "r2", para_etapa: "ativos", created_at: "2026-06-10T09:00:00" },
      { card_id: "r2", para_etapa: "ativos", created_at: "2026-04-01T09:00:00" }, // fora do período
    ]

    const m = calcularMetricas(cards, history, [], range)

    expect(m.recompra.clientesAtivos).toBe(2)
    expect(m.recompra.emRisco).toBe(1)
    expect(m.recompra.perdidos).toBe(1)
    expect(m.recompra.taxaRecompra).toBe(50) // 1 recompra / 2 ativos
  })

  it("B15-01 — Inativos e Inativos RP contam como inativos; Onboarding conta como ativo", () => {
    const cards = [
      card({ id: "r1", funil: "recompra", etapa: "inativos" }),
      card({ id: "r2", funil: "recompra", etapa: "inativos_rp" }),
      card({ id: "r3", funil: "recompra", etapa: "onboarding" }),
    ]
    const m = calcularMetricas(cards, [], [], range)
    expect(m.recompra.inativos).toBe(2)
    expect(m.recompra.clientesAtivos).toBe(1)
  })

  it("calcula receita: total, tickets médios e % de novos clientes", () => {
    const purchases: PurchaseRow[] = [
      // contato A: primeira compra dentro do período (novo)
      { contact_id: "A", data: "2026-06-05", valor: 100 },
      { contact_id: "A", data: "2026-06-20", valor: 200 },
      // contato B: primeira compra antes do período (recorrente)
      { contact_id: "B", data: "2026-05-01", valor: 500 },
      { contact_id: "B", data: "2026-06-10", valor: 300 },
    ]

    const m = calcularMetricas([], [], purchases, range)

    expect(m.receita.quantidadeCompras).toBe(3) // 100, 200, 300
    expect(m.receita.totalCompras).toBe(600)
    expect(m.receita.ticketMedioGeral).toBe(200)
    expect(m.receita.ticketMedioPrimeiraCompra).toBe(100) // só a primeira do contato A
    expect(m.receita.percentualNovos).toBe(50) // 300 de novos / 600 total
  })

  it("retorna nulls quando não há dados (sem divisão por zero)", () => {
    const m = calcularMetricas([], [], [], range)

    expect(m.conversao.taxaGeral).toBeNull()
    expect(m.recompra.taxaRecompra).toBeNull()
    expect(m.receita.ticketMedioGeral).toBeNull()
    expect(m.receita.percentualNovos).toBeNull()
  })
})

describe("calcularPerformanceVendedores", () => {
  it("agrupa métricas por atendente", () => {
    const atendentes = [
      { id: "u1", nome: "Ana" },
      { id: "u2", nome: "Bruno" },
    ]
    const cards = [
      card({ id: "1", atendente_id: "u1", etapa: "ganho", created_at: "2026-06-05T10:00:00" }),
      card({ id: "2", atendente_id: "u1", etapa: "lead", created_at: "2026-06-06T10:00:00" }),
      card({ id: "r1", atendente_id: "u1", funil: "recompra", etapa: "ativos" }),
      card({ id: "3", atendente_id: "u2", etapa: "lead", created_at: "2026-06-07T10:00:00" }),
    ]
    const purchases: PurchaseRow[] = [
      { contact_id: "contato-1", data: "2026-06-10", valor: 400 },
    ]

    const [ana, bruno] = calcularPerformanceVendedores(atendentes, cards, [], purchases, range)

    expect(ana.leadsCriados).toBe(2)
    expect(ana.convertidos).toBe(1)
    expect(ana.taxaConversao).toBe(50)
    expect(ana.clientesAtivos).toBe(1)
    expect(ana.ticketMedio).toBe(400)

    expect(bruno.leadsCriados).toBe(1)
    expect(bruno.convertidos).toBe(0)
    expect(bruno.taxaConversao).toBe(0)
    expect(bruno.ticketMedio).toBeNull()
  })
})

describe("rangeDoPeriodo", () => {
  it("calcula intervalo de 7 dias", () => {
    const agora = new Date("2026-06-12T15:00:00")
    const r = rangeDoPeriodo({ periodo: "7d" }, agora)
    expect(r.fim.getTime()).toBe(agora.getTime())
    expect(r.inicio.getDate()).toBe(5)
  })

  it("calcula 'este mês' começando no dia 1", () => {
    const agora = new Date("2026-06-12T15:00:00")
    const r = rangeDoPeriodo({ periodo: "mes" }, agora)
    expect(r.inicio.getDate()).toBe(1)
    expect(r.inicio.getMonth()).toBe(5) // junho
  })

  it("usa intervalo personalizado quando informado", () => {
    const r = rangeDoPeriodo({ periodo: "custom", inicio: "2026-01-01", fim: "2026-01-31" })
    expect(r.inicio.getMonth()).toBe(0)
    expect(r.fim.getDate()).toBe(31)
  })
})
