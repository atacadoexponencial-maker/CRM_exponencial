// Ajustes pedidos no teste manual dos relatórios (25/10/2026): matriz RFV leva até a lista,
// legenda de R/F/V/FV, indicadores embaixo da matriz, % no Excel e paginação do histórico.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import * as XLSX from "xlsx"
import { calcularRfv } from "@/lib/relatorios/rfv"
import { calcularPainelDeCarteiras } from "@/lib/relatorios/carteiras"
import type { VendaRow } from "@/lib/relatorios/visao-geral"
import { gerarCsv, gerarPlanilha } from "@/lib/exportar-planilha"
import { colunasExportacaoCoorte } from "@/lib/relatorios/exportar-coorte"
import type { Coorte } from "@/lib/relatorios/coorte"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarHistoricoDeCarteira = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarRfv: vi.fn(),
  buscarCarteiras: vi.fn(),
  buscarHistoricoDeCarteira: (...args: unknown[]) => buscarHistoricoDeCarteira(...args),
}))
import { RfvClient } from "@/app/(auth)/relatorios/components/rfv-client"
import { PainelDeCarteiras } from "@/app/(auth)/relatorios/components/carteiras-client"
import type { LinhaDoHistoricoDeCarteira } from "@/app/(auth)/relatorios/actions"

const HOJE = "2026-10-21"
const diasAtras = (n: number) => new Date(Date.UTC(2026, 9, 21 - n)).toISOString().slice(0, 10)
const venda = (contact_id: string, data: string, valor: number): VendaRow => ({ contact_id, data, valor, desconto: null, pecas: null, contato_nome: `Cliente ${contact_id}` })
const extras = { ativos: new Set<string>(), comLembreteRecente: new Set<string>() }

function rfv() {
  const vendas: VendaRow[] = []
  for (let k = 0; k < 5; k++) vendas.push(venda("ana", diasAtras(2 + k), 500))
  for (let i = 0; i < 6; i++) vendas.push(venda(`p${i}`, diasAtras(100 + i), 10))
  return calcularRfv(vendas, HOJE, extras)
}

beforeEach(() => buscarHistoricoDeCarteira.mockReset())

describe("RFV — matriz, legenda e ordem dos blocos", () => {
  it("clicar numa célula leva a tela até a lista e destaca o cartão; limpar não mexe na tela", () => {
    vi.useFakeTimers()
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    render(<RfvClient atendenteId={null} inicial={rfv()} />)
    const destaque = screen.getByTestId("lista-rfv-destaque")

    fireEvent.click(screen.getByTestId("celula-5-5"))
    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar.mock.contexts[0]).toBe(destaque)
    expect(destaque).toHaveAttribute("data-destaque", "true")
    act(() => { vi.advanceTimersByTime(1600) })
    expect(destaque).not.toHaveAttribute("data-destaque")

    fireEvent.click(screen.getByTestId("celula-5-5")) // clicar de novo limpa
    expect(rolar).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it("a tabela explica R, F, V e FV", () => {
    render(<RfvClient atendenteId={null} inicial={rfv()} />)
    const legenda = screen.getByTestId("legenda-rfv")
    for (const trecho of ["Recência", "Frequência", "Valor", "média de F e V", "Notas de 1 a 5"]) expect(legenda).toHaveTextContent(trecho)
  })

  it("indicadores por perfil ficam embaixo da matriz, não ao lado", () => {
    render(<RfvClient atendenteId={null} inicial={rfv()} />)
    const matriz = screen.getByRole("heading", { name: "Matriz RFV: Recência × FV" }).closest("section")!
    const indicadores = screen.getByRole("heading", { name: "Indicadores por perfil" }).closest("section")!
    expect(matriz.parentElement).toBe(indicadores.parentElement)
    expect(matriz.parentElement!.className).not.toMatch(/grid-cols-2/)
    expect(matriz.compareDocumentPosition(indicadores) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe("Excel com porcentagem", () => {
  const coorte = { mes: "2026-07", rotulo: "jul/26", clientes: 2, idade: 3, clientesPorMes: [], retencao: [100, 45.5, null], valorMedio: [], vendasPorMes: [] } as unknown as Coorte

  it("a retenção da coorte sai como porcentagem de verdade (45,5% = 0,455 com formato %)", () => {
    const bytes = gerarPlanilha(colunasExportacaoCoorte("retencao"), [coorte], "Recompra")
    const aba = XLSX.read(bytes, { type: "array", cellNF: true }).Sheets["Recompra"]
    expect(aba["C2"]).toMatchObject({ t: "n", v: 1, z: "0.0%" })
    expect(aba["D2"]).toMatchObject({ t: "n", v: 0.455, z: "0.0%" })
    expect(XLSX.utils.format_cell(aba["D2"])).toBe("45.5%")
  })

  it("no CSV a porcentagem leva vírgula e o símbolo", () => {
    const csv = gerarCsv([{ titulo: "Taxa", tipo: "percentual", valor: (l: { v: number }) => l.v }], [{ v: 45.5 }])
    expect(csv).toContain("45,5%")
  })
})

describe("Carteiras — histórico paginado", () => {
  const linha = (n: number): LinhaDoHistoricoDeCarteira => ({ id: `h${n}`, quando: "2026-10-21T17:03:00Z", contato: `Contato ${n}`, de: null, para: "Ana", motivo: "distribuicao", por: "Admin" })
  const painel = calcularPainelDeCarteiras([], [{ id: "a1", nome: "Ana" }])

  it("mostra 20 por vez com 'Mostrando 1–20 de 45' e a seta busca a página seguinte no servidor", async () => {
    buscarHistoricoDeCarteira.mockResolvedValue({ linhas: Array.from({ length: 20 }, (_, i) => linha(21 + i)), total: 45 })
    render(<PainelDeCarteiras resultado={{ papel: "admin", painel, historico: Array.from({ length: 20 }, (_, i) => linha(1 + i)), historicoTotal: 45 }} />)
    expect(screen.getAllByRole("row")).toHaveLength(21)
    expect(screen.getByTestId("paginacao-historico")).toHaveTextContent("Mostrando 1–20 de 45")
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled()

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Próxima página" })) })
    expect(buscarHistoricoDeCarteira).toHaveBeenCalledWith(1)
    expect(screen.getByTestId("paginacao-historico")).toHaveTextContent("Mostrando 21–40 de 45")
    expect(screen.getByText("Contato 21")).toBeInTheDocument()
    expect(screen.queryByText("Contato 1")).toBeNull()
  })

  it("sem passar de 20 linhas, não mostra as setas", () => {
    render(<PainelDeCarteiras resultado={{ papel: "admin", painel, historico: [linha(1)], historicoTotal: 1 }} />)
    expect(screen.queryByTestId("paginacao-historico")).toBeNull()
  })
})
