// B32-03 — cálculo puro da Visão Geral: período padrão, cartões e comparativos.

import { describe, it, expect } from "vitest"
import {
  calcularCartoes,
  comparacaoJusta,
  intervaloDoPeriodo,
  periodoPadrao,
  type VendaRow,
} from "@/lib/relatorios/visao-geral"

const venda = (data: string, valor: number, extra: Partial<VendaRow> = {}): VendaRow => ({
  contact_id: "c1",
  data,
  valor,
  desconto: null,
  pecas: null,
  ...extra,
})

const cartao = (r: ReturnType<typeof calcularCartoes>, id: string) => r.cartoes.find((c) => c.id === id)!

describe("B32-03 — Visão Geral: período e cartões", () => {
  it("CA-B32-02: abrir a tela mostra o mês atual, de 1º até hoje, e só conta as vendas desse recorte", () => {
    const hoje = "2026-10-21"
    const periodo = periodoPadrao(hoje)
    expect(periodo).toEqual({ tipo: "meses", ano: 2026, meses: [10] })
    expect(intervaloDoPeriodo(periodo, hoje)).toEqual({ de: "2026-10-01", ate: "2026-10-21" })

    const r = calcularCartoes(
      [venda("2026-10-02", 100), venda("2026-10-21", 50), venda("2026-09-30", 999), venda("2026-10-22", 999)],
      periodo,
      hoje
    )
    expect(r.cabecalho.titulo).toBe("Mês: Outubro | Ano: 2026")
    expect(r.resumo.faturamentoLiquido).toBe(150)
    expect(r.resumo.quantidadeVendas).toBe(2)
  })

  it("CA-B32-04: Janeiro a Março soma os três meses e nenhum cartão tem comparativo", () => {
    const hoje = "2026-10-21"
    const r = calcularCartoes(
      [venda("2026-01-10", 100), venda("2026-02-10", 200), venda("2026-03-10", 300), venda("2026-04-01", 999)],
      { tipo: "meses", ano: 2026, meses: [1, 2, 3] },
      hoje
    )
    expect(r.cabecalho.titulo).toBe("Mês: Janeiro, Fevereiro e Março | Ano: 2026")
    expect(r.resumo.faturamentoLiquido).toBe(600)
    expect(r.cartoes.every((c) => c.vsMesPassado === null && c.vsAnoPassado === null)).toBe(true)
    expect(r.cabecalho.aviso).toBeNull()
  })

  it("CA-B32-07: os dez cartões com os valores certos", () => {
    const hoje = "2026-10-21"
    const r = calcularCartoes(
      [
        venda("2026-10-05", 100, { contact_id: "a", desconto: 10, pecas: 2 }),
        venda("2026-10-06", 200, { contact_id: "a", desconto: 0, pecas: 3 }),
        venda("2026-10-07", 300, { contact_id: "b", desconto: null, pecas: null }),
      ],
      periodoPadrao(hoje),
      hoje
    )
    const valores = Object.fromEntries(r.cartoes.map((c) => [c.id, c.valor]))
    expect(valores).toEqual({
      clientesPositivados: 2,
      quantidadeVendas: 3,
      faturamentoBruto: 610,
      descontos: 10,
      faturamentoLiquido: 600,
      ticketMedioPorCliente: 300,
      ticketMedioPorVenda: 200,
      ticketMedioPorPeca: 120,
      pecasPorCliente: 2.5,
      quantidadePecas: 5,
    })
    expect(r.cartoes.map((c) => c.titulo)).toEqual([
      "Clientes positivados", "Qtd de vendas", "Faturamento bruto", "Descontos", "Faturamento líquido",
      "Ticket médio por cliente", "Ticket médio por venda", "Ticket médio por peça", "Peças por cliente", "Qtd de peças",
    ])
  })

  it("CA-B32-08: faturamento líquido +20,0% contra o mês passado e −25,0% contra o ano passado", () => {
    const hoje = "2026-10-21"
    const r = calcularCartoes(
      [venda("2026-10-10", 600), venda("2026-09-10", 500), venda("2025-10-10", 800)],
      periodoPadrao(hoje),
      hoje
    )
    const c = cartao(r, "faturamentoLiquido")
    expect(c.vsMesPassado).toEqual({ percentual: 20, valorComparado: 500, rotulo: "Set/2026" })
    expect(c.vsAnoPassado).toEqual({ percentual: -25, valorComparado: 800, rotulo: "Out/2025" })
  })

  it("CA-B32-09: hoje dia 20, as vendas do dia 20 ficam fora dos dois lados do comparativo e o aviso diz até o dia 19", () => {
    const hoje = "2026-10-20"
    expect(comparacaoJusta({ de: "2026-10-01", ate: "2026-10-20" }, hoje)).toEqual({
      ate: "2026-10-19",
      aviso: "Comparativos até o dia 19, para comparar períodos iguais",
    })
    const r = calcularCartoes(
      [venda("2026-10-10", 100), venda("2026-10-20", 1000), venda("2026-09-10", 100), venda("2026-09-20", 1000)],
      periodoPadrao(hoje),
      hoje
    )
    const c = cartao(r, "faturamentoLiquido")
    // O cartão em si conta o dia 20 (R$ 1.100); o comparativo compara 100 com 100.
    expect(c.valor).toBe(1100)
    expect(c.vsMesPassado).toEqual({ percentual: 0, valorComparado: 100, rotulo: "Set/2026" })
    expect(r.cabecalho.aviso).toBe("Comparativos até o dia 19, para comparar períodos iguais")

    // Mês já fechado: sem aviso, o comparativo usa o mês inteiro.
    const fechado = calcularCartoes([venda("2026-09-20", 1000), venda("2026-08-31", 500)], { tipo: "meses", ano: 2026, meses: [9] }, hoje)
    expect(fechado.cabecalho.aviso).toBeNull()
    expect(cartao(fechado, "faturamentoLiquido").vsMesPassado?.valorComparado).toBe(500)
  })

  it("CA-B32-10: sem venda no ano passado o comparativo é nulo (a tela mostra —)", () => {
    const hoje = "2026-10-21"
    const r = calcularCartoes([venda("2026-10-10", 600), venda("2026-09-10", 500)], periodoPadrao(hoje), hoje)
    const c = cartao(r, "faturamentoLiquido")
    expect(c.vsAnoPassado?.percentual).toBeNull()
    expect(c.vsAnoPassado?.valorComparado).toBe(0)
    expect(c.vsMesPassado?.percentual).toBe(20)
    // Divisão por zero no próprio cartão também vira nulo.
    expect(cartao(r, "ticketMedioPorPeca").valor).toBeNull()
  })
})
