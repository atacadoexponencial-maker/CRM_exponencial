// B32-04 — vendas diárias, projeção do mês e forma de pagamento da Visão Geral.

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  calcularCartoes,
  calcularGraficos,
  faturamentoPorForma,
  periodoMesAnterior,
  periodoPadrao,
  projecaoDoMes,
  vendasDiarias,
  type VendaRow,
} from "@/lib/relatorios/visao-geral"
import { ROTULO_FORMA_PAGAMENTO } from "@/lib/compras"

vi.mock("@/app/(auth)/relatorios/actions", () => ({ buscarVisaoGeral: vi.fn() }))
import { RelatoriosClient } from "@/app/(auth)/relatorios/components/relatorios-client"

const venda = (data: string, valor: number, extra: Partial<VendaRow> = {}): VendaRow => ({
  contact_id: "c1", data, valor, desconto: null, pecas: null, ...extra,
})

describe("B32-04 — gráficos da Visão Geral", () => {
  it("CA-B32-11: Outubro/2026 tem 31 dias no eixo, com valor, peças e ticket nos dias 3 e 17 e zero nos demais", () => {
    const dias = vendasDiarias(
      [venda("2026-10-03", 100, { pecas: 4 }), venda("2026-10-03", 300, { pecas: 6 }), venda("2026-10-17", 50, { pecas: 1 }), venda("2026-11-01", 999)],
      { de: "2026-10-01", ate: "2026-10-31" }
    )
    expect(dias).toHaveLength(31)
    expect(dias.map((d) => d.rotulo)).toEqual(Array.from({ length: 31 }, (_, i) => String(i + 1)))
    expect(dias[2]).toEqual({ data: "2026-10-03", rotulo: "3", valor: 400, pecas: 10, ticket: 200 })
    expect(dias[16]).toEqual({ data: "2026-10-17", rotulo: "17", valor: 50, pecas: 1, ticket: 50 })
    const outros = dias.filter((_, i) => i !== 2 && i !== 16)
    expect(outros.every((d) => d.valor === 0 && d.pecas === 0 && d.ticket === null)).toBe(true)
  })

  it("CA-B32-13: hoje 11/10 com R$ 1.000 de 1º a 10: média R$ 100, 21 dias projetam R$ 2.100 e o total é R$ 3.100", () => {
    const hoje = "2026-10-11"
    const p = projecaoDoMes(
      [venda("2026-10-01", 400), venda("2026-10-05", 600), venda("2026-10-11", 999)],
      periodoPadrao(hoje),
      hoje
    )!
    expect(p.realizadoAteOntem).toBe(1000)
    expect(p.mediaDiaria).toBe(100)
    expect(p.diasRestantes).toBe(21)
    expect(p.totalProjetado).toBe(3100)
    expect(p.dias).toHaveLength(31)
    expect(p.dias[0]).toEqual({ data: "2026-10-01", rotulo: "1", realizado: 400, projetado: null })
    expect(p.dias[10]).toEqual({ data: "2026-10-11", rotulo: "11", realizado: null, projetado: 100 })
    expect(p.dias.filter((d) => d.projetado !== null)).toHaveLength(21)
  })

  it("CA-B32-14: com 'Mês anterior' não há projeção e a tela não desenha o bloco", () => {
    const hoje = "2026-10-21"
    const vendas = [venda("2026-09-10", 500), venda("2026-10-10", 600)]
    expect(projecaoDoMes(vendas, periodoMesAnterior(hoje), hoje)).toBeNull()
    expect(projecaoDoMes(vendas, { tipo: "ontem" }, hoje)).toBeNull()
    expect(projecaoDoMes(vendas, { tipo: "meses", ano: 2026, meses: [9, 10] }, hoje)).toBeNull()
    expect(projecaoDoMes(vendas, periodoPadrao(hoje), hoje)).not.toBeNull()

    const montar = (periodo: ReturnType<typeof periodoPadrao>) => ({
      ...calcularCartoes(vendas, periodo, hoje),
      graficos: calcularGraficos(vendas, periodo, hoje, ROTULO_FORMA_PAGAMENTO),
      atendenteId: null,
    })
    const atual = render(<RelatoriosClient visaoInicial={montar(periodoPadrao(hoje))} atendentes={[]} papel="admin" hoje={hoje} />)
    expect(screen.getByText("Projeção de vendas — mês atual")).toBeTruthy()
    atual.unmount()
    render(<RelatoriosClient visaoInicial={montar(periodoMesAnterior(hoje))} atendentes={[]} papel="admin" hoje={hoje} />)
    expect(screen.queryByText("Projeção de vendas — mês atual")).toBeNull()
    expect(screen.getByText("Vendas diárias")).toBeTruthy()
    expect(screen.getByText("Forma de pagamento")).toBeTruthy()
  })

  it("CA-B32-18: Pix R$ 300 (60,0%), Boleto R$ 100 (20,0%) e Não informada R$ 100 (20,0%), nessa ordem", () => {
    const formas = faturamentoPorForma(
      [
        venda("2026-10-02", 100, { forma_pagamento: "boleto" }),
        venda("2026-10-03", 100, { forma_pagamento: null }),
        venda("2026-10-04", 200, { forma_pagamento: "pix" }),
        venda("2026-10-05", 100, { forma_pagamento: "pix" }),
      ],
      { de: "2026-10-01", ate: "2026-10-31" },
      ROTULO_FORMA_PAGAMENTO
    )
    expect(formas).toEqual([
      { forma: "pix", rotulo: "Pix", valor: 300, percentual: 60 },
      { forma: "boleto", rotulo: "Boleto", valor: 100, percentual: 20 },
      { forma: null, rotulo: "Não informada", valor: 100, percentual: 20 },
    ])
  })
})
