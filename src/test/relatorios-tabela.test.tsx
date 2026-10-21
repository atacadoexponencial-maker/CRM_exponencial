// B32-05 — tabela das vendas do período: ordem, colunas e busca pelo contato.

import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { vendasDoPeriodo, type VendaRow } from "@/lib/relatorios/visao-geral"
import { ROTULO_FORMA_PAGAMENTO, ROTULO_ORIGEM_COMPRA } from "@/lib/compras"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
import { TabelaVendas } from "@/app/(auth)/relatorios/components/tabela-vendas"

const rotulos = { origem: ROTULO_ORIGEM_COMPRA, forma: ROTULO_FORMA_PAGAMENTO }

const venda = (id: string, data: string, valor: number, extra: Partial<VendaRow> = {}): VendaRow => ({
  id, contact_id: `c-${id}`, data, valor, desconto: null, pecas: null, contato_nome: `Contato ${id}`, created_at: `${data}T10:00:00Z`, ...extra,
})

describe("B32-05 — tabela de vendas do período", () => {
  it("CA-B32-15: lista só as vendas do mês, da mais recente para a mais antiga, com todas as colunas", () => {
    const linhas = vendasDoPeriodo(
      [
        venda("1", "2026-10-03", 100, { contato_nome: "Loja da Ana", contato_telefone: "5581999990001", contato_cidade: "Recife", contato_uf: "PE", pecas: 4, forma_pagamento: "pix", atendente_nome: "Bruno", origem: "catalogo", pedido_numero: 123 }),
        venda("2", "2026-10-15", 250, { contato_nome: "Bazar do Bruno", origem: "manual" }),
        venda("3", "2026-10-09", 80, { contato_nome: "Armarinho Carla", origem: "externa" }),
        venda("4", "2026-09-30", 999, { contato_nome: "Mês passado" }),
      ],
      { de: "2026-10-01", ate: "2026-10-31" },
      rotulos
    )
    expect(linhas.map((l) => l.contato)).toEqual(["Bazar do Bruno", "Armarinho Carla", "Loja da Ana"])
    expect(linhas[2]).toEqual({
      id: "1", contatoId: "c-1", contato: "Loja da Ana", telefone: "5581999990001", data: "2026-10-03", origem: "Catálogo #123",
      atendente: "Bruno", cidade: "Recife", uf: "PE", pecas: 4, formaPagamento: "Pix", valor: 100,
    })
    expect(linhas[0].origem).toBe("Manual")
    expect(linhas[1].origem).toBe("Externa")

    render(<TabelaVendas vendas={linhas} urlExportar="/relatorios/vendas/exportar?tipo=meses&ano=2026&meses=10" />)
    const cabecalho = screen.getAllByRole("columnheader").map((th) => th.textContent)
    expect(cabecalho).toEqual(["Contato", "Telefone", "Data", "Origem", "Atendente", "Cidade", "UF", "Peças", "Forma de pagamento", "Valor"])
    const corpo = screen.getAllByRole("row").slice(1)
    expect(corpo).toHaveLength(3)
    const celulas = within(corpo[2]).getAllByRole("cell").map((td) => td.textContent?.replace(/ /g, " "))
    expect(celulas).toEqual(["Loja da Ana", "(81) 99999-0001", "03/10/2026", "Catálogo #123", "Bruno", "Recife", "PE", "4", "Pix", "R$ 100,00"])
    expect(within(corpo[2]).getByRole("link", { name: "Loja da Ana" })).toHaveAttribute("href", "/contatos/c-1")
    expect(screen.getByRole("link", { name: /Exportar/ })).toHaveAttribute("href", "/relatorios/vendas/exportar?tipo=meses&ano=2026&meses=10")
  })

  it("CA-B32-16: digitar 'ana' deixa só a linha da 'Loja da Ana'", () => {
    const linhas = vendasDoPeriodo(
      [venda("1", "2026-10-03", 100, { contato_nome: "Loja da Ana" }), venda("2", "2026-10-15", 250, { contato_nome: "Bazar do Bruno" })],
      { de: "2026-10-01", ate: "2026-10-31" },
      rotulos
    )
    render(<TabelaVendas vendas={linhas} urlExportar="#" />)
    expect(screen.getAllByRole("row")).toHaveLength(3)
    fireEvent.change(screen.getByLabelText("Pesquisar contato"), { target: { value: "ana" } })
    const corpo = screen.getAllByRole("row").slice(1)
    expect(corpo).toHaveLength(1)
    expect(corpo[0]).toHaveTextContent("Loja da Ana")
    expect(screen.queryByText("Bazar do Bruno")).toBeNull()
    fireEvent.change(screen.getByLabelText("Pesquisar contato"), { target: { value: "zzz" } })
    expect(screen.getByText("Nenhuma venda com esse nome.")).toBeTruthy()
  })
})
