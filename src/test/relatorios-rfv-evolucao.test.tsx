// B33-03 — evolução dos perfis (semanal e mensal), base saudável e a aba RFV completa.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { calcularRfv, evolucaoDosPerfis, referenciasMensais, referenciasSemanais, semanaIso, type EvolucaoRfv } from "@/lib/relatorios/rfv"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf, type VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarRfv = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarVisaoGeral: vi.fn(),
  buscarRfv: (...args: unknown[]) => buscarRfv(...args),
}))
import { EvolucaoPerfis } from "@/app/(auth)/relatorios/components/evolucao-perfis"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const HOJE = "2026-10-21"
const venda = (contact_id: string, data: string, valor: number): VendaRow => ({ contact_id, data, valor, desconto: null, pecas: null, contato_nome: `Cliente ${contact_id}` })
const extras = { ativos: new Set<string>(), comLembreteRecente: new Set<string>() }

beforeEach(() => buscarRfv.mockReset())

describe("B33-03 — evolução dos perfis", () => {
  it("CA-B33-13: 14 colunas S43 a S30; Campeão 1 na S41 e 0 na S42/S43 (−1 (−100%) na S42); Fiéis 0 na S41 e 1 na S42 (+1)", () => {
    // Última venda em 11/09: até 11/10 (30 dias) é R 5 = Campeão; em 18/10 (37 dias) vira R 4 = Clientes Fiéis.
    const vendas = [venda("a", "2026-09-11", 100), venda("a", "2026-08-01", 100), venda("a", "2026-07-01", 100)]
    expect(semanaIso(HOJE)).toBe(43)
    expect(referenciasSemanais(HOJE)).toEqual([
      "2026-10-21", "2026-10-18", "2026-10-11", "2026-10-04", "2026-09-27", "2026-09-20", "2026-09-13",
      "2026-09-06", "2026-08-30", "2026-08-23", "2026-08-16", "2026-08-09", "2026-08-02", "2026-07-26",
    ])
    const ev = evolucaoDosPerfis(vendas, HOJE)
    expect(ev.semanal).toHaveLength(14)
    expect(ev.semanal.map((c) => c.rotulo)).toEqual(["S43", "S42", "S41", "S40", "S39", "S38", "S37", "S36", "S35", "S34", "S33", "S32", "S31", "S30"])
    const col = (r: string) => ev.semanal.find((c) => c.rotulo === r)!
    expect(col("S41").porPerfil.campeao).toBe(1)
    expect(col("S42").porPerfil.campeao).toBe(0)
    expect(col("S43").porPerfil.campeao).toBe(0)
    expect(col("S41").porPerfil.fieis).toBe(0)
    expect(col("S42").porPerfil.fieis).toBe(1)
    expect(col("S42").sub).toBe("18/10")

    render(<EvolucaoPerfis evolucao={ev} />)
    const linhaCampeao = screen.getByTestId("evolucao-campeao")
    const celulas = within(linhaCampeao).getAllByRole("cell").slice(1)
    expect(celulas[0].textContent).toBe("00 (0%)") // S43 vs S42
    expect(celulas[1].textContent).toBe("0−1 (−100%)") // S42 vs S41
    expect(celulas[2].textContent).toBe("10 (0%)") // S41 vs S40: Campeão nas duas
    const linhaFieis = screen.getByTestId("evolucao-fieis")
    expect(within(linhaFieis).getAllByRole("cell").slice(1)[1].textContent).toBe("1+1 (—)")
    expect(screen.getAllByRole("columnheader").slice(1).map((th) => th.textContent)).toEqual(ev.semanal.map((c) => c.rotulo + c.sub))
  })

  it("CA-B33-14: 'Mensal' mostra 13 colunas de Out/26 a Out/25, com a referência no último dia de cada mês e hoje na atual", () => {
    expect(referenciasMensais(HOJE)).toEqual([
      "2026-10-21", "2026-09-30", "2026-08-31", "2026-07-31", "2026-06-30", "2026-05-31", "2026-04-30",
      "2026-03-31", "2026-02-28", "2026-01-31", "2025-12-31", "2025-11-30", "2025-10-31",
    ])
    const ev = evolucaoDosPerfis([venda("a", "2026-10-01", 100)], HOJE)
    expect(ev.mensal).toHaveLength(13)
    expect(ev.mensal.map((c) => c.rotulo)).toEqual(["Out/26", "Set/26", "Ago/26", "Jul/26", "Jun/26", "Mai/26", "Abr/26", "Mar/26", "Fev/26", "Jan/26", "Dez/25", "Nov/25", "Out/25"])
    // Um cliente só: topo dos quintis (F 5, V 5) e 20 dias sem compra = Campeão.
    expect(ev.mensal[0].porPerfil.campeao).toBe(1)
    expect(ev.mensal[1].saudavel).toBe(0)

    render(<EvolucaoPerfis evolucao={ev} />)
    fireEvent.click(screen.getByRole("button", { name: "Mensal" }))
    expect(screen.getByTestId("evolucao-mensal")).toBeTruthy()
    const cabecalhos = screen.getAllByRole("columnheader").slice(1)
    expect(cabecalhos).toHaveLength(13)
    expect(cabecalhos[0]).toHaveAttribute("title", "Perfis em 21/10/2026")
    expect(cabecalhos[1]).toHaveAttribute("title", "Perfis em 30/09/2026")
  })

  it("CA-B33-15: base saudável 64 contra 71: −7 e −10% em vermelho", () => {
    const col = (rotulo: string, saudavel: number) => ({
      referencia: "2026-10-21", rotulo, sub: "21/10", saudavel,
      porPerfil: { campeao: saudavel, fieis: 0, potencial_fiel: 0, recentes: 0, promissores: 0, precisa_atencao: 0, nao_perder: 0, em_risco: 0, semi_perdido: 0, hibernando: 0, perdido: 0 },
    })
    const ev: EvolucaoRfv = { semanal: [col("S36", 64), col("S35", 71)], mensal: [] }
    render(<EvolucaoPerfis evolucao={ev} />)
    const bloco = screen.getByTestId("base-saudavel")
    const cartoes = Array.from(bloco.children).map((c) => c.textContent)
    expect(cartoes[0]).toBe("S3664 clientes")
    expect(cartoes[1]).toBe("S3571 clientes")
    expect(cartoes[2]).toBe("Crescimento−7")
    expect(cartoes[3]).toBe("Variação−10%")
    expect(bloco.children[2].querySelector("p.text-lg")).toHaveClass("text-red-400")
    expect(bloco.children[3].querySelector("p.text-lg")).toHaveClass("text-red-400")
  })

  it("CA-B33-01: clicar na aba RFV mostra o cabeçalho, a matriz, os indicadores, a lista e a evolução", async () => {
    const vendas = [venda("a", "2026-10-15", 300), venda("b", "2026-05-02", 50)]
    buscarRfv.mockResolvedValue(calcularRfv(vendas, HOJE, extras))
    const periodo = periodoPadrao(HOJE)
    const visao = {
      ...calcularCartoes(vendas, periodo, HOJE), graficos: calcularGraficos(vendas, periodo, HOJE, {}), tabela: [],
      porUf: variacaoPorUf(vendas, periodo, HOJE), mesesHistorico: historicoDe25Meses(vendas, HOJE), atendenteId: null,
    }
    render(<RelatoriosClient visaoInicial={visao} atendentes={[{ id: "a1", nome: "Ana" }]} papel="admin" hoje={HOJE} />)
    const abaRfv = within(screen.getByRole("tablist")).getByRole("tab", { name: "RFV" })
    fireEvent.click(abaRfv)
    expect(abaRfv).toHaveAttribute("aria-selected", "true")
    await waitFor(() => expect(screen.getByTestId("rfv-referencia")).toHaveTextContent("21/10/2026"))
    expect(buscarRfv).toHaveBeenCalledWith({ atendenteId: null })
    expect(screen.getByTestId("rfv-base")).toHaveTextContent("2 clientes com compra")
    expect(screen.getByRole("group", { name: "Matriz RFV" })).toBeTruthy()
    expect(screen.getByText("Indicadores por perfil")).toBeTruthy()
    expect(screen.getByText("Clientes por perfil RFV")).toBeTruthy()
    expect(screen.getByText("Evolução dos perfis")).toBeTruthy()
    expect(screen.queryByText("Vendas diárias")).toBeNull()

    // O filtro de atendente vale para o RFV também.
    fireEvent.change(screen.getByLabelText("Atendente"), { target: { value: "a1" } })
    await waitFor(() => expect(buscarRfv).toHaveBeenLastCalledWith({ atendenteId: "a1" }))

    // Voltar para a Visão Geral.
    fireEvent.click(within(screen.getByRole("tablist")).getByRole("tab", { name: "Visão Geral" }))
    expect(screen.getByText("Vendas diárias")).toBeTruthy()
  })
})
