// B36-04 — Dashboard no estilo Caderno: faixa de números com a variação, os mesmos
// números de antes e os gráficos de antes embaixo dos blocos novos.

import { readFileSync } from "node:fs"
import path from "node:path"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/dashboard" }))
vi.mock("@/app/(auth)/dashboard/actions", () => ({ buscarPainelDashboard: vi.fn() }))
vi.mock("@/app/(auth)/agenda/actions", () => ({ marcarLembreteFeito: vi.fn(async () => ({})) }))

import { DashboardClient } from "@/app/(auth)/dashboard/components/dashboard-client"
import { FaixaDeNumeros } from "@/components/shared/faixa-de-numeros"
import type { PainelDashboard } from "@/app/(auth)/dashboard/actions"

const PAINEL: PainelDashboard = {
  metricas: {
    entrada: { novosLeads: 14, leadsAtivos: 10, leadsPorSemana: [{ label: "S1", valor: 3 }, { label: "S2", valor: 5 }] },
    conversao: { taxaGeral: 36, funil: [{ etapa: "lead", label: "Lead", quantidade: 4, percentualDaAnterior: null }] },
    recompra: { clientesAtivos: 21, taxaRecompra: 41, emRisco: 6, inativos: 7, perdidos: 8, distribuicao: [{ label: "Ativos", valor: 21, cor: "#22c55e" }] },
    receita: { totalCompras: 38939, quantidadeCompras: 30, ticketMedioPrimeiraCompra: 812, ticketMedioGeral: 1297.97, percentualNovos: 22 },
  },
  variacoes: {
    totalCompras: { valor: 12, unidade: "%" },
    quantidadeCompras: null,
    ticketMedioGeral: { valor: -3, unidade: "%" },
    novosLeads: null,
    taxaRecompra: { valor: 2, unidade: "pp" },
  },
  funilEntrada: [{ id: "lead", label: "Lead", quantidade: 4 }],
}

function telaDoDashboard() {
  return render(
    <DashboardClient
      painelInicial={PAINEL}
      atendentes={[]}
      papel="admin"
      cabecalho={{ data: "Terça, 21 de outubro", saudacao: "Bom dia, Ana" }}
      paraHoje={[]}
      esperando={{ conversas: [], total: 0 }}
    />
  )
}

describe("B36-04 — Dashboard no estilo Caderno", () => {
  it("CA-B36-12: should mostrar os valores em fonte de número e a variação que sobe em verde e a que cai em vermelho", () => {
    const { container } = render(
      <FaixaDeNumeros
        destaque
        itens={[
          { rotulo: "Faturado", valor: "R$ 100,00", variacao: { valor: 12, unidade: "%" } },
          { rotulo: "Ticket médio", valor: "R$ 10,00", variacao: { valor: -3, unidade: "%" } },
        ]}
      />
    )
    for (const valor of container.querySelectorAll("dd")) expect(valor).toHaveClass("numero")
    expect(container.querySelector('[data-variacao="alta"]')).toHaveClass("text-alta")
    expect(container.querySelector('[data-variacao="alta"]')!.textContent).toBe("+12%")
    expect(container.querySelector('[data-variacao="queda"]')).toHaveClass("text-queda")
    expect(container.querySelector('[data-variacao="queda"]')!.textContent).toBe("−3%")

    // As classes apontam para a fonte de número (IBM Plex Mono), o texto para a IBM Plex Sans
    // e as cores de alta e queda são o verde e o vermelho do tema claro.
    const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf-8")
    expect(css).toMatch(/\.numero \{\s*font-family: var\(--font-mono\)/)
    expect(css).toMatch(/--font-mono: var\(--font-plex-mono\)/)
    expect(css).toMatch(/body \{[^}]*font-family: var\(--font-sans\)/)
    expect(css).toMatch(/--font-sans: var\(--font-plex-sans\)/)
    expect(css).toMatch(/--alta: #17694F/)
    expect(css).toMatch(/--queda: #A3361F/)
  })

  it("CA-B36-15: should mostrar todos os números que o Dashboard já mostrava, com os mesmos valores", () => {
    telaDoDashboard()
    const texto = document.body.textContent!.replace(/\s+/g, " ")
    for (const esperado of [
      "R$ 38.939,00", "30 compras", "R$ 1.297,97", "14", "41%", // faixa do topo
      "10", "36%", "21", "6", "7", "8", "R$ 812,00", "22%", // seções embaixo
    ]) {
      expect(texto).toContain(esperado)
    }
    for (const rotulo of [
      "Leads ativos no funil agora", "Taxa de conversão (lead → ganho)", "Clientes ativos agora", "Em risco", "Inativos", "Perdidos",
      "Ticket médio de primeira compra", "Faturamento de clientes novos", "Novos leads", "Taxa de recompra", "Ticket médio",
    ]) {
      expect(screen.getAllByText((_, el) => el?.tagName === "DT" && el.textContent!.startsWith(rotulo)).length).toBeGreaterThan(0)
    }
  })

  it("CA-B36-21: should manter os gráficos de antes, abaixo dos blocos novos", () => {
    telaDoDashboard()
    const blocos = screen.getByRole("region", { name: "Esperando resposta" })
    for (const grafico of ["Leads criados por semana", "Funil de conversão (% sobre a etapa anterior)", "Distribuição da base de clientes"]) {
      const titulo = screen.getByText(grafico)
      expect(blocos.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(within(screen.getByRole("region", { name: "Funil de Entrada" })).getByText("Abrir pipeline")).toHaveAttribute("href", "/pipeline")
  })
})
