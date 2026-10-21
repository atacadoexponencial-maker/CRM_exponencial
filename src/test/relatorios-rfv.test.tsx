// B33-01 — cálculo RFV: notas, perfis, matriz e indicadores. Sem banco.

import { describe, it, expect, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { calcularRfv, notasPorQuintil, type ExtrasRfv } from "@/lib/relatorios/rfv"
import { deslocarMeses, type VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarRfv: vi.fn() }))
import { IndicadoresPorPerfil, MatrizRfv } from "@/app/(auth)/relatorios/components/rfv-client"

const HOJE = "2026-10-21"
const diasAtras = (n: number) => {
  const d = new Date(Date.UTC(2026, 9, 21 - n))
  return d.toISOString().slice(0, 10)
}
const venda = (contact_id: string, data: string, valor: number): VendaRow => ({
  contact_id, data, valor, desconto: null, pecas: null, contato_nome: `Cliente ${contact_id}`,
})
const semExtras: ExtrasRfv = { ativos: new Set(), comLembreteRecente: new Set() }

describe("B33-01 — RFV", () => {
  it("CA-B33-02: notas R, F, V, FV e perfis dos cinco clientes do exemplo", () => {
    const vendas: VendaRow[] = []
    const clientes = [
      { id: "a", dias: 10, n: 1, valor: 100 },
      { id: "b", dias: 45, n: 2, valor: 200 },
      { id: "c", dias: 80, n: 3, valor: 300 },
      { id: "d", dias: 120, n: 4, valor: 400 },
      { id: "e", dias: 200, n: 5, valor: 500 },
    ]
    for (const c of clientes) {
      // última venda há `dias`; as demais, logo antes (todas dentro dos 12 meses)
      for (let k = 0; k < c.n; k++) vendas.push(venda(c.id, diasAtras(c.dias + k * 7), c.valor / c.n))
    }
    const r = calcularRfv(vendas, HOJE, semExtras)
    expect(r.base).toBe(5)
    const por = Object.fromEntries(r.clientes.map((c) => [c.contatoId, c]))
    expect(["a", "b", "c", "d", "e"].map((id) => por[id].r)).toEqual([5, 4, 3, 2, 1])
    expect(["a", "b", "c", "d", "e"].map((id) => por[id].f)).toEqual([1, 2, 3, 4, 5])
    expect(["a", "b", "c", "d", "e"].map((id) => por[id].v)).toEqual([1, 2, 3, 4, 5])
    expect(["a", "b", "c", "d", "e"].map((id) => por[id].fv)).toEqual([1, 2, 3, 4, 5])
    expect(["a", "b", "c", "d", "e"].map((id) => por[id].perfil)).toEqual(["recentes", "potencial_fiel", "precisa_atencao", "em_risco", "nao_perder"])
    expect(por.a.diasSemCompra).toBe(10)
    expect(por.e.vendas12m).toBe(5)
    expect(por.e.valor12m).toBe(500)
  })

  it("CA-B33-04: dez clientes empatados com 2 vendas recebem a mesma nota, 5", () => {
    const valores = new Map(Array.from({ length: 10 }, (_, i) => [`c${i}`, 2]))
    expect([...notasPorQuintil(valores).values()]).toEqual(Array(10).fill(5))
    // Zero é sempre 1; o resto distribui em quintos.
    const mista = new Map([["z", 0], ["a", 10], ["b", 9], ["c", 8], ["d", 7], ["e", 6]])
    expect(Object.fromEntries(notasPorQuintil(mista))).toEqual({ a: 5, b: 4, c: 3, d: 2, e: 1, z: 1 })
    // Venda única há 14 meses: F 1, V 1, R 1, Perdido (parte pura do CA-B33-03).
    const antiga = calcularRfv([venda("x", deslocarMeses(HOJE, -14), 900)], HOJE, semExtras)
    expect(antiga.clientes[0]).toMatchObject({ r: 1, f: 1, v: 1, fv: 1, perfil: "perdido", vendas12m: 0, valor12m: 0 })
  })

  it("CA-B33-06: a célula R 5 / FV 5 mostra 3, Campeão e 67% ativos; são 25 células", () => {
    const vendas: VendaRow[] = []
    for (const id of ["a", "b", "c"]) for (let k = 0; k < 5; k++) vendas.push(venda(id, diasAtras(5 + k), 100))
    const r = calcularRfv(vendas, HOJE, { ativos: new Set(["a", "b"]), comLembreteRecente: new Set() })
    expect(r.matriz).toHaveLength(25)
    const campeao = r.matriz.find((c) => c.r === 5 && c.fv === 5)!
    expect(campeao).toEqual({ r: 5, fv: 5, perfil: "campeao", clientes: 3, percentualAtivos: 67 })
    expect(r.matriz.filter((c) => c.clientes === 0)).toHaveLength(24)
    expect(r.matriz[0]).toMatchObject({ r: 1, fv: 5, perfil: "nao_perder", clientes: 0, percentualAtivos: null })

    render(<MatrizRfv celulas={r.matriz} selecionada={null} onSelecionar={() => {}} />)
    const celula = screen.getByTestId("celula-5-5")
    expect(celula).toHaveTextContent("3")
    expect(celula).toHaveTextContent("Campeão")
    expect(celula).toHaveTextContent("67% ativos")
    expect(within(screen.getByRole("group", { name: "Matriz RFV" })).getAllByRole("button")).toHaveLength(25)
  })

  it("CA-B33-08: Campeão com 2 clientes: 1 (50%) sem lembrete, 15 dias, 3,0 vendas e R$ 750,00", () => {
    const vendas: VendaRow[] = []
    for (let k = 0; k < 4; k++) vendas.push(venda("a", diasAtras(10 + k), 250))
    for (let k = 0; k < 2; k++) vendas.push(venda("b", diasAtras(20 + k), 250))
    // Oito clientes pequenos e antigos: a e b ficam no quinto de cima (nota 5) e viram Campeão.
    for (let i = 0; i < 8; i++) vendas.push(venda(`p${i}`, diasAtras(100 + i), 10))
    const r = calcularRfv(vendas, HOJE, { ativos: new Set(), comLembreteRecente: new Set(["a"]) })
    expect(r.clientes.filter((c) => c.perfil === "campeao").map((c) => c.contatoId).sort()).toEqual(["a", "b"])
    const campeao = r.indicadores.find((i) => i.perfil === "campeao")!
    expect(campeao).toEqual({ perfil: "campeao", clientes: 2, semLembrete: 1, percentualSemLembrete: 50, diasSemCompraMedio: 15, vendasMedias: 3, valorMedioPorCliente: 750 })

    render(<IndicadoresPorPerfil indicadores={r.indicadores} />)
    const linha = screen.getByTestId("indicador-campeao")
    expect(within(linha).getAllByRole("cell").map((td) => td.textContent?.replace(/ /g, " "))).toEqual(["🏆Campeão", "2", "1 (50%)", "15 dias", "3,0", "R$ 750,00"])
  })

  it("CA-B33-09: perfil sem cliente mostra 0 e —", () => {
    const r = calcularRfv([venda("a", diasAtras(3), 50)], HOJE, semExtras)
    const hib = r.indicadores.find((i) => i.perfil === "hibernando")!
    expect(hib).toEqual({ perfil: "hibernando", clientes: 0, semLembrete: 0, percentualSemLembrete: null, diasSemCompraMedio: null, vendasMedias: null, valorMedioPorCliente: null })
    render(<IndicadoresPorPerfil indicadores={r.indicadores} />)
    expect(within(screen.getByTestId("indicador-hibernando")).getAllByRole("cell").map((td) => td.textContent)).toEqual(["😴Hibernando", "0", "—", "—", "—", "—"])
    expect(r.indicadores).toHaveLength(11)
  })
})
