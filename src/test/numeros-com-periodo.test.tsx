// B47-10 — números que não se confundem: o faturamento diz de quando é, no
// Dashboard e nos Relatórios, e os contatos sem compra das Carteiras não se chamam
// "Leads", como os cards do Pipeline.

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/dashboard" }))
vi.mock("@/app/(auth)/dashboard/actions", () => ({ buscarPainelDashboard: vi.fn() }))
vi.mock("@/app/(auth)/agenda/actions", () => ({ marcarLembreteFeito: vi.fn(async () => ({})) }))
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarVisaoGeral: vi.fn(), buscarRfv: vi.fn(), buscarCoorte: vi.fn(), buscarFunilClientes: vi.fn(), buscarCarteiras: vi.fn(),
}))

import { DashboardClient } from "@/app/(auth)/dashboard/components/dashboard-client"
import type { PainelDashboard } from "@/app/(auth)/dashboard/actions"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"
import { PainelDeCarteiras } from "@/app/(auth)/relatorios/components/carteiras-client"
import { calcularPainelDeCarteiras } from "@/lib/relatorios/carteiras"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf } from "@/lib/relatorios/visao-geral"
import { calcularMetricas } from "@/lib/metricas-dashboard"

const HOJE = "2026-10-27"

describe("B47-10 — números com período e nomes claros", () => {
  it("CA-B47-24: o faturamento do Dashboard em 30 dias diz as datas de começo e fim", () => {
    // 30 dias até 27/10 às 15:00 de Brasília
    const range = { inicio: new Date("2026-09-27T18:00:00.000Z"), fim: new Date("2026-10-27T18:00:00.000Z") }
    const metricas = calcularMetricas([], [], [], range)
    expect(metricas.periodo).toEqual({ inicio: range.inicio.toISOString(), fim: range.fim.toISOString() })

    const painel: PainelDashboard = {
      metricas,
      variacoes: { totalCompras: null, quantidadeCompras: null, ticketMedioGeral: null, novosLeads: null, taxaRecompra: null },
      funilEntrada: [],
    }
    render(
      <DashboardClient painelInicial={painel} atendentes={[]} papel="admin" cabecalho={{ data: "Terça", saudacao: "Oi" }} paraHoje={[]} esperando={{ conversas: [], total: 0 }} />
    )
    expect(screen.getByText(/Faturado de 27\/09 a 27\/10/)).toBeTruthy()
  })

  it("CA-B47-24: o faturamento dos Relatórios no mês diz de 01/10 a hoje", () => {
    const periodo = periodoPadrao(HOJE)
    const visao = { ...calcularCartoes([], periodo, HOJE), graficos: calcularGraficos([], periodo, HOJE, {}), tabela: [], porUf: variacaoPorUf([], periodo, HOJE), mesesHistorico: historicoDe25Meses([], HOJE), atendenteId: null }
    render(<RelatoriosClient visaoInicial={visao} atendentes={[]} papel="admin" hoje={HOJE} />)
    expect(within(screen.getByTestId("cartao-faturamentoBruto")).getByText("01/10 a 27/10")).toBeTruthy()
    expect(within(screen.getByTestId("cartao-faturamentoLiquido")).getByText("01/10 a 27/10")).toBeTruthy()
  })

  it("CA-B47-25: nas Carteiras, os contatos sem compra se chamam 'Sem compra', e não 'Leads'", () => {
    const painel = calcularPainelDeCarteiras(
      [{ id: "l1", atendenteId: null, temCompra: false, ativo: false }, { id: "b1", atendenteId: null, temCompra: true, ativo: true }],
      []
    )
    render(<PainelDeCarteiras resultado={{ papel: "admin", painel, historico: [] }} />)
    expect(screen.getAllByText("Sem compra").length).toBeGreaterThan(0)
    expect(screen.queryByText("Leads")).toBeNull()
    expect(screen.queryByText(/\bleads\b/)).toBeNull()
  })
})
