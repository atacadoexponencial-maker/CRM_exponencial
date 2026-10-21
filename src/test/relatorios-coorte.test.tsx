// B34-01 — coortes pelo mês da primeira venda: janela, retenção e valor médio.

import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { calcularCoortes } from "@/lib/relatorios/coorte"
import type { VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarCoorte: vi.fn() }))
import { TabelasDeCoorte } from "@/app/(auth)/relatorios/components/coorte-client"

const HOJE = "2026-10-21"
const venda = (contact_id: string, data: string, valor = 100): VendaRow => ({ contact_id, data, valor, desconto: null, pecas: null })

describe("B34-01 — coortes", () => {
  it("CA-B34-02: 12 coortes de Nov/2025 a Out/2026; Set/2024 fica fora; Mar/2026 tem idade 7 e — do Mês 8 em diante", () => {
    const r = calcularCoortes([venda("a", "2025-10-05"), venda("b", "2026-03-10"), venda("c", "2024-09-01"), venda("c", "2026-10-02")], HOJE)
    expect(r.coortes).toHaveLength(12)
    expect(r.coortes.map((c) => c.rotulo)).toEqual(["Nov/2025", "Dez/2025", "Jan/2026", "Fev/2026", "Mar/2026", "Abr/2026", "Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026"])
    // "a" (Out/2025) e "c" (Set/2024) ficam fora da janela; "c" comprou de novo hoje e mesmo assim não entra.
    expect(r.coortes.reduce((s, c) => s + c.clientes, 0)).toBe(1)
    const mar = r.coortes.find((c) => c.rotulo === "Mar/2026")!
    expect(mar.clientes).toBe(1)
    expect(mar.idade).toBe(7)
    expect(mar.retencao.slice(0, 8).every((v) => v !== null)).toBe(true)
    expect(mar.retencao.slice(8)).toEqual([null, null, null, null])
    expect(mar.retencao[0]).toBe(100)
    expect(mar.retencao).toHaveLength(12)
  })

  it("CA-B34-03: coorte Nov/2025 com 4 clientes: 100%, 25%, 0%, 50%", () => {
    const vendas = [
      venda("a", "2025-11-03"), venda("b", "2025-11-10"), venda("c", "2025-11-20"), venda("d", "2025-11-28"),
      venda("a", "2025-12-15"), // Mês 1: 1 de 4
      venda("b", "2026-02-02"), venda("c", "2026-02-20"), venda("c", "2026-02-25"), // Mês 3: 2 de 4
    ]
    const nov = calcularCoortes(vendas, HOJE).coortes.find((c) => c.rotulo === "Nov/2025")!
    expect(nov.clientes).toBe(4)
    expect(nov.retencao.slice(0, 4)).toEqual([100, 25, 0, 50])
    expect(nov.clientesPorMes.slice(0, 4)).toEqual([4, 1, 0, 2])

    render(<TabelasDeCoorte coortes={[nov]} atendenteId={null} />)
    const linha = screen.getByTestId("coorte-2025-11")
    const celulas = within(linha).getAllByRole("cell").map((td) => td.textContent)
    expect(celulas.slice(0, 6)).toEqual(["Nov/2025", "4", "100%", "25%", "0%", "50%"])
    // Nov/2025 tem idade 11: todos os 12 meses existem; o Mês 11 (Out/2026) é 0%.
    expect(celulas).toHaveLength(14)
    expect(celulas[13]).toBe("0%")
    expect(screen.getByTestId("celula-2025-11-3")).toHaveAttribute("title", "Fev/2026: 2 de 4 clientes")
    expect(screen.getByRole("link", { name: /Exportar/ })).toHaveAttribute("href", "/relatorios/coorte/exportar?tabela=retencao")
  })

  it("CA-B34-04: valor médio do Mês 1 é R$ 200,00 e mês sem venda mostra —", () => {
    const vendas = [venda("a", "2025-11-03", 50), venda("b", "2025-11-10", 70), venda("a", "2025-12-01", 100), venda("a", "2025-12-05", 200), venda("b", "2025-12-20", 300)]
    const nov = calcularCoortes(vendas, HOJE).coortes.find((c) => c.rotulo === "Nov/2025")!
    expect(nov.valorMedio[0]).toBe(60)
    expect(nov.valorMedio[1]).toBe(200)
    expect(nov.valorMedio[2]).toBeNull()
    expect(nov.vendasPorMes[1]).toBe(3)

    render(<TabelasDeCoorte coortes={[nov]} atendenteId="a1" />)
    fireEvent.click(screen.getByRole("tab", { name: "Valor médio de venda" }))
    const celulas = within(screen.getByTestId("coorte-2025-11")).getAllByRole("cell").map((td) => td.textContent?.replace(/ /g, " "))
    expect(celulas.slice(2, 5)).toEqual(["R$ 60", "R$ 200", "—"])
    expect(screen.getByRole("link", { name: /Exportar/ })).toHaveAttribute("href", "/relatorios/coorte/exportar?tabela=valor&atendente=a1")
  })
})
