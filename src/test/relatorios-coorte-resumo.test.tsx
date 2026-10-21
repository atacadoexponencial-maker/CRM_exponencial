// B34-02 — retenção média geral, recompra geral por mês e a aba Coorte completa.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { calcularCoortes, resumoDasCoortes, type Coorte } from "@/lib/relatorios/coorte"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf, type VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarCoorte = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarVisaoGeral: vi.fn(),
  buscarRfv: vi.fn(),
  buscarCoorte: (...args: unknown[]) => buscarCoorte(...args),
}))
import { ResumoDasCoortes } from "@/app/(auth)/relatorios/components/coorte-client"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const HOJE = "2026-10-21"
const venda = (contact_id: string, data: string, valor = 100): VendaRow => ({ contact_id, data, valor, desconto: null, pecas: null })

/** Coorte de apoio: só o que o resumo lê. */
function coorte(rotulo: string, clientes: number, idade: number, clientesPorMes: number[]): Coorte {
  const porMes = Array.from({ length: 12 }, (_, k) => (k <= idade ? (clientesPorMes[k] ?? 0) : null))
  return {
    mes: rotulo, rotulo, clientes, idade,
    clientesPorMes: porMes,
    retencao: porMes.map((n, k) => (n === null ? null : k === 0 ? 100 : Math.round((n / clientes) * 1000) / 10)),
    valorMedio: porMes.map(() => null),
    vendasPorMes: porMes,
  }
}

beforeEach(() => buscarCoorte.mockReset())

describe("B34-02 — resumo das coortes", () => {
  it("CA-B34-05: coortes A (4 clientes, 25% e 50%) e B (2 clientes, 0%): retenção média geral 30%", () => {
    const resumo = resumoDasCoortes([coorte("A", 4, 2, [4, 1, 2]), coorte("B", 2, 1, [2, 0])])
    expect(resumo.retencaoMediaGeral).toBe(30)
    render(<ResumoDasCoortes resumo={resumo} />)
    expect(screen.getByTestId("retencao-media-geral")).toHaveTextContent("30%")
    // Sem coorte com idade ≥ 1: "—".
    expect(resumoDasCoortes([coorte("C", 5, 0, [5])]).retencaoMediaGeral).toBeNull()
  })

  it("CA-B34-06: recompra geral: Mês 1 = 16,7%, Mês 2 = 50%, Mês 3 a 11 nulos", () => {
    const resumo = resumoDasCoortes([coorte("A", 4, 2, [4, 1, 2]), coorte("B", 2, 1, [2, 0])])
    expect(resumo.recompraPorMes).toHaveLength(11)
    expect(resumo.recompraPorMes[0]).toEqual({ mes: 1, percentual: 16.7, clientes: 1, base: 6 })
    expect(resumo.recompraPorMes[1]).toEqual({ mes: 2, percentual: 50, clientes: 2, base: 4 })
    expect(resumo.recompraPorMes.slice(2).every((m) => m.percentual === null && m.base === 0)).toBe(true)
    render(<ResumoDasCoortes resumo={resumo} />)
    const itens = within(screen.getByTestId("recompra-por-mes")).getAllByRole("listitem").map((li) => li.textContent)
    expect(itens.slice(0, 3)).toEqual(["Mês 1: 16.7%", "Mês 2: 50%", "Mês 3: —"])
  })

  it("CA-B34-01: clicar na aba Coorte mostra retenção média, gráfico, tabelas e o Entenda", async () => {
    const vendas = [venda("a", "2026-08-05"), venda("a", "2026-09-10"), venda("b", "2026-09-02")]
    buscarCoorte.mockResolvedValue(calcularCoortes(vendas, HOJE))
    const periodo = periodoPadrao(HOJE)
    const visao = {
      ...calcularCartoes(vendas, periodo, HOJE), graficos: calcularGraficos(vendas, periodo, HOJE, {}), tabela: [],
      porUf: variacaoPorUf(vendas, periodo, HOJE), mesesHistorico: historicoDe25Meses(vendas, HOJE), atendenteId: null,
    }
    render(<RelatoriosClient visaoInicial={visao} atendentes={[]} papel="admin" hoje={HOJE} />)
    const aba = within(screen.getByRole("tablist", { name: "Relatórios" })).getByRole("tab", { name: "Coorte" })
    fireEvent.click(aba)
    expect(aba).toHaveAttribute("aria-selected", "true")
    await waitFor(() => expect(screen.getByTestId("retencao-media-geral")).toBeTruthy())
    expect(buscarCoorte).toHaveBeenCalledWith({ atendenteId: null })
    expect(screen.getByText("Recompra geral por mês")).toBeTruthy()
    expect(screen.getByRole("tab", { name: "Retenção de clientes" })).toBeTruthy()
    expect(screen.getByTestId("tabela-retencao")).toBeTruthy()
    const entenda = screen.getByRole("button", { name: "Entenda a análise de coortes" })
    expect(entenda).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(entenda)
    expect(screen.getByText("O que são coortes?")).toBeTruthy()
    expect(screen.queryByText("Vendas diárias")).toBeNull()
  })
})
