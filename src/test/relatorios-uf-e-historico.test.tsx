// B32-06 — variação por UF contra o ano anterior e o gráfico dos últimos 25 meses.

import { describe, it, expect } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { historicoDe25Meses, variacaoPorUf, type VendaRow } from "@/lib/relatorios/visao-geral"
import { VariacaoPorUfTabela } from "@/app/(auth)/relatorios/components/variacao-por-uf"

const venda = (data: string, valor: number, extra: Partial<VendaRow> = {}): VendaRow => ({
  contact_id: "c1", data, valor, desconto: null, pecas: null, ...extra,
})

describe("B32-06 — variação por UF e 25 meses", () => {
  it("CA-B32-19: PE com 2 clientes (+100,00%), R$ 1.000 (+25,00%) e ticket R$ 500; o total repete; e a tabela ordena ao clicar", () => {
    const hoje = "2026-10-21"
    const vendas = [
      venda("2026-09-05", 600, { contact_id: "a", contato_uf: "PE" }),
      venda("2026-09-20", 400, { contact_id: "b", contato_uf: "PE" }),
      venda("2025-09-10", 800, { contact_id: "a", contato_uf: "PE" }),
    ]
    const v = variacaoPorUf(vendas, { tipo: "meses", ano: 2026, meses: [9] }, hoje)
    expect(v.aviso).toBeNull()
    expect(v.rotuloBase).toBe("Set/2025")
    expect(v.linhas).toEqual([{ uf: "PE", clientes: 2, crescimentoClientes: 100, vendas: 1000, crescimentoVendas: 25, ticketMedio: 500 }])
    expect(v.total).toEqual({ uf: "TOTAL", clientes: 2, crescimentoClientes: 100, vendas: 1000, crescimentoVendas: 25, ticketMedio: 500 })

    // Sem UF vira "Sem UF"; sem base no ano anterior, "—" (nulo). Comparação justa no mês atual.
    const v2 = variacaoPorUf(
      [venda("2026-10-02", 100, { contact_id: "x", contato_uf: null }), venda("2026-10-21", 900, { contact_id: "y", contato_uf: "SP" }), venda("2025-10-03", 50, { contact_id: "y", contato_uf: "SP" })],
      { tipo: "meses", ano: 2026, meses: [10] },
      hoje
    )
    expect(v2.aviso).toBe("Comparativos até o dia 20, para comparar períodos iguais")
    expect(v2.linhas.map((l) => l.uf)).toEqual(["SP", "Sem UF"])
    const sp = v2.linhas[0]
    // O cartão mostra o período inteiro (R$ 900), mas o crescimento compara até o dia 20: 0 contra 50 = −100%.
    expect(sp.vendas).toBe(900)
    expect(sp.crescimentoVendas).toBe(-100)
    expect(v2.linhas[1]).toMatchObject({ uf: "Sem UF", clientes: 1, vendas: 100, crescimentoClientes: null, crescimentoVendas: null })

    render(<VariacaoPorUfTabela variacao={v2} urlExportar="#" />)
    const ordemInicial = screen.getAllByRole("row").slice(1, -1).map((r) => within(r).getAllByRole("cell")[0].textContent)
    expect(ordemInicial).toEqual(["SP", "Sem UF"])
    fireEvent.click(screen.getByRole("button", { name: /^Vendas/ })) // já era por vendas desc; clicar inverte
    expect(screen.getAllByRole("row").slice(1, -1).map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["Sem UF", "SP"])
    fireEvent.click(screen.getByRole("button", { name: /^UF/ }))
    expect(screen.getAllByRole("row").slice(1, -1).map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["Sem UF", "SP"])
    expect(screen.getByTestId("linha-total")).toHaveTextContent("TOTAL")
    expect(screen.getByRole("link", { name: /Exportar Excel/ })).toBeTruthy()
  })

  it("CA-B32-21: de Out/2024 a Out/2026, 25 meses, com Out/2026 em R$ 600 e +20,0%", () => {
    const hoje = "2026-10-21"
    const meses = historicoDe25Meses(
      [venda("2025-10-15", 500), venda("2026-10-10", 600), venda("2026-10-21", 999), venda("2024-10-01", 100), venda("2024-09-30", 777)],
      hoje
    )
    expect(meses).toHaveLength(25)
    expect(meses[0]).toEqual({ mes: "2024-10", rotulo: "Out/24", valor: 100, variacao: null })
    expect(meses[12]).toEqual({ mes: "2025-10", rotulo: "Out/25", valor: 500, variacao: 400 })
    expect(meses[24]).toEqual({ mes: "2026-10", rotulo: "Out/26", valor: 600, variacao: 20 })
    expect(meses[1]).toEqual({ mes: "2024-11", rotulo: "Nov/24", valor: 0, variacao: null })
  })
})
