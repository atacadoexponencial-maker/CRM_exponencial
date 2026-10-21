// B30-05: donut e funil do dashboard desenhados pela biblioteca de gráficos, com os
// mesmos números de antes. Testes em jsdom, sem banco.

import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { calcularMetricas, type CardRow } from "@/lib/metricas-dashboard"
import { GraficoDonut, GraficoFunil } from "@/app/(auth)/dashboard/components/graficos"

const range = { inicio: new Date("2026-06-01T00:00:00"), fim: new Date("2026-06-30T23:59:59") }

function card(parcial: Partial<CardRow> & { id: string }): CardRow {
  return { contact_id: `contato-${parcial.id}`, etapa: "lead", funil: "entrada", atendente_id: null, created_at: "2026-06-10T10:00:00Z", ...parcial }
}

// O que a versão anterior (gráficos em CSS puro) entregava para este conjunto de cards.
const cards: CardRow[] = [
  card({ id: "e1", etapa: "lead" }),
  card({ id: "e2", etapa: "sondagem" }),
  card({ id: "e3", etapa: "negociacao" }),
  card({ id: "e4", etapa: "ganho" }),
  card({ id: "r1", funil: "recompra", etapa: "ativos" }),
  card({ id: "r2", funil: "recompra", etapa: "ativos" }),
  card({ id: "r3", funil: "recompra", etapa: "ativos_ri" }),
  card({ id: "r4", funil: "recompra", etapa: "inativos" }),
  card({ id: "r5", funil: "recompra", etapa: "perdidos" }),
  card({ id: "r6", funil: "recompra", etapa: "perdidos" }),
]
const DISTRIBUICAO_ANTERIOR = [
  { label: "Ativos", valor: 2, cor: "#22c55e" },
  { label: "Em Risco", valor: 1, cor: "#f59e0b" },
  { label: "Inativos", valor: 1, cor: "#6b7280" },
  { label: "Perdidos", valor: 2, cor: "#ef4444" },
]
const FUNIL_ANTERIOR = [
  { etapa: "lead", label: "Lead", quantidade: 4, percentualDaAnterior: null },
  { etapa: "sondagem", label: "Sondagem", quantidade: 3, percentualDaAnterior: 75 },
  { etapa: "catalogo_enviado", label: "Catálogo Enviado", quantidade: 2, percentualDaAnterior: 67 },
  { etapa: "follow_catalogo", label: "Follow do Catálogo", quantidade: 2, percentualDaAnterior: 100 },
  { etapa: "negociacao", label: "Negociação", quantidade: 2, percentualDaAnterior: 100 },
  { etapa: "ganho", label: "Ganho", quantidade: 1, percentualDaAnterior: 50 },
]

describe("B30-05 — Gráficos do dashboard com a biblioteca", () => {
  it("CA-B30-20: a distribuição e o funil entregues ao gráfico são os mesmos de antes, e os gráficos mostram exatamente esses valores", () => {
    const m = calcularMetricas(cards, [], [], range)
    expect(m.recompra.distribuicao).toEqual(DISTRIBUICAO_ANTERIOR)
    expect(m.conversao.funil).toEqual(FUNIL_ANTERIOR)

    const donut = render(<GraficoDonut dados={m.recompra.distribuicao} />)
    for (const d of DISTRIBUICAO_ANTERIOR) {
      const linha = donut.getByText(d.label).parentElement!
      expect(linha.textContent).toContain(`${d.label}${d.valor}(${Math.round((d.valor / 6) * 100)}%)`)
    }
    // Uma fatia por categoria com valor, com a cor de sempre.
    const fatias = donut.container.querySelectorAll(".recharts-pie-sector")
    expect(fatias).toHaveLength(4)
    expect([...fatias].map((f) => f.querySelector("path")?.getAttribute("fill"))).toEqual(DISTRIBUICAO_ANTERIOR.map((d) => d.cor))

    // O funil é responsivo: o Recharts mede o contêiner com ResizeObserver, que o jsdom não
    // tem. Simula um cartão de 520px de largura, como no navegador.
    const tamanho = { width: 520, height: m.conversao.funil.length * 30 + 8 }
    vi.stubGlobal("ResizeObserver", class {
      constructor(private cb: (entries: unknown[]) => void) {}
      observe(el: Element) { this.cb([{ target: el, contentRect: tamanho }]) }
      unobserve() {}
      disconnect() {}
    })
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ ...tamanho, x: 0, y: 0, top: 0, left: 0, right: tamanho.width, bottom: tamanho.height, toJSON: () => ({}) })
    const funil = render(<GraficoFunil etapas={m.conversao.funil} />)
    const rotulos = [...funil.container.querySelectorAll(".recharts-label-list text")].map((t) => t.textContent)
    expect(rotulos).toEqual(FUNIL_ANTERIOR.map((e) => String(e.quantidade)))
    const eixos = [...funil.container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")].map((t) =>
      // O jsdom não mede texto, então o Recharts quebra o rótulo em várias linhas (tspan).
      [...t.querySelectorAll("tspan")].map((s) => s.textContent).join(" "),
    )
    expect(eixos).toEqual(FUNIL_ANTERIOR.map((e) => e.label))
    expect(funil.container.textContent).toContain("—75%67%100%100%50%")
  })
})
