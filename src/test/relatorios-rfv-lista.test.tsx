// B33-02 — lista de clientes por perfil RFV: filtro pela célula, colunas, paginação, busca.

import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { calcularRfv } from "@/lib/relatorios/rfv"
import type { VendaRow } from "@/lib/relatorios/visao-geral"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarRfv: vi.fn() }))
import { RfvClient } from "@/app/(auth)/relatorios/components/rfv-client"

const HOJE = "2026-10-21"
const diasAtras = (n: number) => new Date(Date.UTC(2026, 9, 21 - n)).toISOString().slice(0, 10)
const venda = (contact_id: string, data: string, valor: number, nome = `Cliente ${contact_id}`): VendaRow => ({
  contact_id, data, valor, desconto: null, pecas: null, contato_nome: nome, contato_cidade: "Recife", contato_uf: "PE",
})
const extras = { ativos: new Set<string>(), comLembreteRecente: new Set<string>() }

/** 2 campeões (Loja da Ana e Bazar do Bruno) e N clientes pequenos e antigos. */
function base(n: number) {
  const vendas: VendaRow[] = []
  for (let k = 0; k < 5; k++) vendas.push(venda("ana", diasAtras(2 + k), 500, "Loja da Ana"))
  for (let k = 0; k < 5; k++) vendas.push(venda("bruno", diasAtras(3 + k), 500, "Bazar do Bruno"))
  for (let i = 0; i < n; i++) vendas.push(venda(`p${i}`, diasAtras(100 + i), 10))
  return calcularRfv(vendas, HOJE, extras)
}

const lista = () => within(screen.getByTestId("lista-rfv"))
const linhas = () => lista().getAllByRole("row").slice(1)
const nomes = () => linhas().map((r) => within(r).getAllByRole("cell")[0].textContent)

describe("B33-02 — clientes por perfil RFV", () => {
  it("CA-B33-07: clicar na célula R 5 / FV 5 deixa só os clientes dela e mostra o chip; clicar de novo limpa", () => {
    const r = base(8)
    render(<RfvClient atendenteId={null} inicial={r} />)
    expect(linhas()).toHaveLength(10)
    fireEvent.click(screen.getByTestId("celula-5-5"))
    expect(nomes().sort()).toEqual(["Bazar do Bruno", "Loja da Ana"])
    expect(screen.getByTestId("chip-celula")).toHaveTextContent("Campeão · R 5 · FV 5")
    fireEvent.click(screen.getByTestId("celula-5-5"))
    expect(screen.queryByTestId("chip-celula")).toBeNull()
    expect(linhas()).toHaveLength(10)
    // O × também limpa.
    fireEvent.click(screen.getByTestId("celula-5-5"))
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro da matriz" }))
    expect(linhas()).toHaveLength(10)
  })

  it("CA-B33-10: 30 clientes: 25 linhas com as colunas, 'Mostrando 1–25 de 30' e a seta avança para os 5", () => {
    const r = base(28)
    render(<RfvClient atendenteId={null} inicial={r} />)
    expect(lista().getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Cliente", "Perfil", "R", "F", "V", "FV", "Dias s/ compra", "Vendas 12m", "Valor 12m", "Última venda", "Atendente", "Cidade", "UF",
    ])
    expect(linhas()).toHaveLength(25)
    expect(screen.getByTestId("rfv-paginacao")).toHaveTextContent("Mostrando 1–25 de 30 clientes")
    // Perfil mais valioso primeiro: os dois campeões abrem a lista.
    expect(nomes().slice(0, 2).sort()).toEqual(["Bazar do Bruno", "Loja da Ana"])
    const ana = linhas().find((l) => l.textContent?.includes("Loja da Ana"))!
    const celulas = within(ana).getAllByRole("cell").map((td) => td.textContent?.replace(/ /g, " "))
    expect(celulas.slice(1)).toEqual(["🏆 Campeão", "5", "5", "5", "5", "2", "5", "R$ 2.500,00", "19/10/2026", "—", "Recife", "PE"])
    expect(within(ana).getByRole("link", { name: "Loja da Ana" })).toHaveAttribute("href", "/contatos/ana")

    fireEvent.click(screen.getByRole("button", { name: "Próxima página" }))
    expect(linhas()).toHaveLength(5)
    expect(screen.getByTestId("rfv-paginacao")).toHaveTextContent("Mostrando 26–30 de 30 clientes")
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled()
  })

  it("CA-B33-11: 'Campeão' + 'ana' deixa só a 'Loja da Ana'", () => {
    const r = base(8)
    render(<RfvClient atendenteId={null} inicial={r} />)
    fireEvent.change(screen.getByLabelText("Perfil"), { target: { value: "campeao" } })
    expect(nomes().sort()).toEqual(["Bazar do Bruno", "Loja da Ana"])
    fireEvent.change(screen.getByLabelText("Buscar cliente"), { target: { value: "ana" } })
    expect(nomes()).toEqual(["Loja da Ana"])
    expect(screen.getByRole("link", { name: /Excel/ })).toHaveAttribute("href", "/relatorios/rfv/exportar?perfil=campeao&busca=ana")
    fireEvent.change(screen.getByLabelText("Buscar cliente"), { target: { value: "zzz" } })
    expect(lista().getByText("Nenhum cliente com esse filtro.")).toBeTruthy()
  })
})
