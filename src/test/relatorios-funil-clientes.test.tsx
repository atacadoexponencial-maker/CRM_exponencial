// B34-03 — funil de clientes "1+ a 7+ compras": etapas, conversões, ticket médio, parados e a aba.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { calcularFunilClientes } from "@/lib/relatorios/funil-clientes"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf, type VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarFunilClientes = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarVisaoGeral: vi.fn(),
  buscarRfv: vi.fn(),
  buscarCoorte: vi.fn(),
  buscarFunilClientes: (...args: unknown[]) => buscarFunilClientes(...args),
}))
import { FunilDeClientes } from "@/app/(auth)/relatorios/components/funil-clientes-client"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const HOJE = "2026-10-21"
const diasAtras = (n: number) => new Date(Date.UTC(2026, 9, 21 - n)).toISOString().slice(0, 10)
const venda = (contact_id: string, data: string, valor = 100): VendaRow => ({ contact_id, data, valor, desconto: null, pecas: null })

/** 10 clientes com 1 venda, 5 com 2 e 2 com 3, todas de R$ 100 e recentes. */
function baseDoExemplo() {
  const vendas: VendaRow[] = []
  for (let i = 0; i < 10; i++) vendas.push(venda(`u${i}`, diasAtras(5)))
  for (let i = 0; i < 5; i++) for (let k = 0; k < 2; k++) vendas.push(venda(`d${i}`, diasAtras(5 + k)))
  for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) vendas.push(venda(`t${i}`, diasAtras(5 + k)))
  return vendas
}

beforeEach(() => buscarFunilClientes.mockReset())

describe("B34-03 — funil de clientes", () => {
  it("CA-B34-09: 17, 7, 2 e zeros; conversões 41,2% e 28,6%; ticket médio de 2+ R$ 228,57", () => {
    const r = calcularFunilClientes(baseDoExemplo(), HOJE)
    expect(r.etapas.map((e) => e.clientes)).toEqual([17, 7, 2, 0, 0, 0, 0])
    expect(r.etapas.map((e) => e.conversao)).toEqual([null, 41.2, 28.6, 0, null, null, null])
    expect(r.etapas[1].ticketMedio).toBe(228.57)
    expect(r.etapas[0].ticketMedio).toBe(Math.round((1000 + 1000 + 600) / 17 * 100) / 100)
    expect(r.etapas[3].ticketMedio).toBeNull()
    expect(r.taxas.map((t) => `${t.de}→${t.para}`)).toEqual(["1→2", "2→3", "3→4", "4→5", "5→6", "6→7"])
    expect(r.taxas[0].percentual).toBe(41.2)

    render(<FunilDeClientes resultado={r} />)
    const legenda = within(screen.getByTestId("legenda-funil")).getAllByRole("listitem").map((li) => li.textContent)
    expect(legenda[0]).toBe("1+ compras: 17 · parados: 0")
    expect(legenda[6]).toBe("7+ compras: 0 · parados: 0")
    const taxas = Array.from(screen.getByTestId("taxas-conversao").children).map((c) => c.textContent)
    expect(taxas[0]).toBe("1ª → 2ª41,2%")
    expect(taxas[1]).toBe("2ª → 3ª28,6%")
    const linha2 = within(screen.getByTestId("etapa-2")).getAllByRole("cell").map((td) => td.textContent?.replace(/ /g, " "))
    expect(linha2).toEqual(["2+ compras", "7", "41,2%", "R$ 228,57", "0"])
  })

  it("CA-B34-10: 91 dias sem venda é parado, 90 não: etapa 2+ com 1 parado", () => {
    const vendas = [
      venda("a", diasAtras(200)), venda("a", diasAtras(91)),
      venda("b", diasAtras(200)), venda("b", diasAtras(90)),
      venda("c", diasAtras(300)), // 1 venda, parado, só na etapa 1+
    ]
    const r = calcularFunilClientes(vendas, HOJE)
    expect(r.etapas[0].parados).toBe(2) // a e c
    expect(r.etapas[1].parados).toBe(1) // só a
    expect(r.etapas[1].clientes).toBe(2)
  })

  it("CA-B34-11: clicar na aba Funil de clientes mostra funil, legenda, taxas, tabela e dicas", async () => {
    const vendas = baseDoExemplo()
    buscarFunilClientes.mockResolvedValue(calcularFunilClientes(vendas, HOJE))
    const periodo = periodoPadrao(HOJE)
    const visao = {
      ...calcularCartoes(vendas, periodo, HOJE), graficos: calcularGraficos(vendas, periodo, HOJE, {}), tabela: [],
      porUf: variacaoPorUf(vendas, periodo, HOJE), mesesHistorico: historicoDe25Meses(vendas, HOJE), atendenteId: null,
    }
    render(<RelatoriosClient visaoInicial={visao} atendentes={[]} papel="admin" hoje={HOJE} />)
    const aba = within(screen.getByRole("tablist", { name: "Relatórios" })).getByRole("tab", { name: "Funil de clientes" })
    fireEvent.click(aba)
    expect(aba).toHaveAttribute("aria-selected", "true")
    await waitFor(() => expect(screen.getByTestId("legenda-funil")).toBeTruthy())
    expect(buscarFunilClientes).toHaveBeenCalledWith({ atendenteId: null })
    expect(screen.getByText("Taxas de conversão")).toBeTruthy()
    expect(screen.getByTestId("tabela-funil")).toBeTruthy()
    expect(screen.queryByText("Como melhorar suas taxas de conversão")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /O que são clientes parados/ }))
    expect(screen.getByTestId("explicacao-parados")).toHaveTextContent("90 dias")
    expect(screen.queryByText("Vendas diárias")).toBeNull()
  })
})
