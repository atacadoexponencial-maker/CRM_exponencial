// B35-01 — aba Carteiras: painel da empresa, carteira por vendedor e a aba na tela.

import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { calcularPainelDeCarteiras, type ContatoDaCarteira } from "@/lib/relatorios/carteiras"
import { calcularCartoes, calcularGraficos, historicoDe25Meses, periodoPadrao, variacaoPorUf } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
const buscarCarteiras = vi.fn()
vi.mock("@/app/(auth)/relatorios/actions", () => ({
  buscarVisaoGeral: vi.fn(),
  buscarRfv: vi.fn(),
  buscarCoorte: vi.fn(),
  buscarFunilClientes: vi.fn(),
  buscarCarteiras: (...args: unknown[]) => buscarCarteiras(...args),
}))
import { PainelDeCarteiras } from "@/app/(auth)/relatorios/components/carteiras-client"
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"
import type { ResultadoCarteiras } from "@/app/(auth)/relatorios/actions"

const HOJE = "2026-10-21"
const ANA = "a1", BRUNO = "b1"
const contato = (id: string, atendenteId: string | null, temCompra: boolean, ativo = false): ContatoDaCarteira => ({ id, atendenteId, temCompra, ativo })

/** 3 leads e 4 da base (1 ativo); 5 com vendedor (todos da Ana), 2 sem. */
const CONTATOS = [
  contato("l1", ANA, false), contato("l2", ANA, false), contato("l3", null, false),
  contato("b1", ANA, true, true), contato("b2", ANA, true), contato("b3", ANA, true), contato("b4", null, true),
]
const VENDEDORES = [{ id: ANA, nome: "Ana" }, { id: BRUNO, nome: "Bruno" }]

const numeros = (testid: string) => Array.from(screen.getByTestId(testid).querySelectorAll("p.text-2xl")).map((p) => p.textContent)

beforeEach(() => buscarCarteiras.mockReset())

describe("B35-01 — painel de carteiras", () => {
  it("CA-B35-02: Total 3/4/1/3, Com carteira 2/3/1/2, Sem carteira 1/1/0/1", () => {
    const painel = calcularPainelDeCarteiras(CONTATOS, VENDEDORES)
    expect(painel.total).toEqual({ leads: 3, base: 4, ativos: 1, inativos: 3 })
    expect(painel.comCarteira).toEqual({ leads: 2, base: 3, ativos: 1, inativos: 2 })
    expect(painel.semCarteira).toEqual({ leads: 1, base: 1, ativos: 0, inativos: 1 })
    expect(painel.semVendedor).toEqual({ total: 2, comCompra: 1, leads: 1 })

    render(<PainelDeCarteiras resultado={{ papel: "admin", painel, historico: [] }} />)
    expect(numeros("numeros-total")).toEqual(["3", "4", "1", "3"])
    expect(numeros("numeros-com")).toEqual(["2", "3", "1", "2"])
    expect(numeros("numeros-sem")).toEqual(["1", "1", "0", "1"])
    expect(screen.getByTestId("sem-vendedor")).toHaveTextContent("2contatos sem vendedor1 com compra · 1 sem compra")
  })

  it("CA-B35-03: Ana '5 na carteira' com 2/3/1/2 e Bruno '0 na carteira' com zeros", () => {
    const painel = calcularPainelDeCarteiras(CONTATOS, VENDEDORES)
    expect(painel.vendedores).toEqual([
      { id: ANA, nome: "Ana", total: 5, leads: 2, base: 3, ativos: 1, inativos: 2 },
      { id: BRUNO, nome: "Bruno", total: 0, leads: 0, base: 0, ativos: 0, inativos: 0 },
    ])
    render(<PainelDeCarteiras resultado={{ papel: "admin", painel, historico: [] }} />)
    const ana = screen.getByTestId(`vendedor-${ANA}`)
    expect(ana).toHaveTextContent("5 na carteira")
    expect(within(ana).getAllByRole("strong").map((s) => s.textContent)).toEqual(["2", "3", "1", "2"])
    const bruno = screen.getByTestId(`vendedor-${BRUNO}`)
    expect(bruno).toHaveTextContent("0 na carteira")
    expect(within(bruno).getAllByRole("strong").map((s) => s.textContent)).toEqual(["0", "0", "0", "0"])
    // Atendente: só o próprio cartão, sem visão geral, sem sem-vendedor e sem histórico.
    const soAna: ResultadoCarteiras = { papel: "atendente", painel: calcularPainelDeCarteiras(CONTATOS.filter((c) => c.atendenteId === ANA), [VENDEDORES[0]]), historico: null }
    const { container } = render(<PainelDeCarteiras resultado={soAna} />)
    expect(within(container).queryByTestId("numeros-total")).toBeNull()
    expect(within(container).queryByTestId("sem-vendedor")).toBeNull()
    expect(within(container).queryByText("Histórico de alterações")).toBeNull()
    expect(within(container).getByText("Minha carteira")).toBeTruthy()
  })

  it("CA-B35-01: clicar na aba Carteiras mostra visão geral, carteira por vendedor, sem vendedor e histórico", async () => {
    const painel = calcularPainelDeCarteiras(CONTATOS, VENDEDORES)
    buscarCarteiras.mockResolvedValue({
      papel: "admin", painel,
      historico: [{ id: "h1", quando: "2026-10-21T17:03:00Z", contato: "Loja da Ana", de: null, para: "Ana", motivo: "pelo_card", por: "Admin" }],
    } satisfies ResultadoCarteiras)
    const periodo = periodoPadrao(HOJE)
    const visao = {
      ...calcularCartoes([], periodo, HOJE), graficos: calcularGraficos([], periodo, HOJE, {}), tabela: [],
      porUf: variacaoPorUf([], periodo, HOJE), mesesHistorico: historicoDe25Meses([], HOJE), atendenteId: null,
    }
    render(<RelatoriosClient visaoInicial={visao} atendentes={VENDEDORES} papel="admin" hoje={HOJE} />)
    const aba = within(screen.getByRole("tablist", { name: "Relatórios" })).getByRole("tab", { name: "Carteiras" })
    fireEvent.click(aba)
    expect(aba).toHaveAttribute("aria-selected", "true")
    await waitFor(() => expect(screen.getByTestId("numeros-total")).toBeTruthy())
    expect(buscarCarteiras).toHaveBeenCalled()
    expect(screen.getByText("Carteira por vendedor")).toBeTruthy()
    expect(screen.getByTestId("sem-vendedor")).toBeTruthy()
    const historico = screen.getByTestId("historico-carteira")
    expect(within(historico).getAllByRole("row")[1]).toHaveTextContent("Loja da AnaninguémAnapelo cardAdmin")
    // Carteiras não tem o filtro de atendente.
    expect(screen.queryByLabelText("Atendente")).toBeNull()
    expect(screen.queryByText("Vendas diárias")).toBeNull()
  })
})
