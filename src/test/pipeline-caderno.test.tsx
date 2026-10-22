// B36-05 — Pipeline no estilo Caderno: quantidade e soma no título da coluna, total já
// comprado e há quanto tempo o card está parado.

import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { ColunaKanban } from "@/app/(auth)/pipeline/components/coluna-kanban"
import { limiteDeParado, situacaoDoCard } from "@/lib/card-parado"
import { CONFIG_ALERTAS_PADRAO } from "@/lib/alertas"
import type { CardLead } from "@/app/(auth)/pipeline/mock-pipeline"

const AGORA = new Date("2026-10-22T15:00:00-03:00")
const horasAtras = (h: number) => new Date(Date.now() - h * 3600000).toISOString()

function card(id: string, nome: string, extra: Partial<CardLead>): CardLead {
  return {
    id, contato: { nome, telefone: "5511999990000" }, etapa: "lead", atendente: "Ana", tempoNaEtapa: "Hoje",
    dataEntradaEtapa: "22/10/2026", tempoNoFunil: "Hoje", etiquetas: [], conversaId: null, ...extra,
  }
}

describe("B36-05 — Pipeline no estilo Caderno", () => {
  it("CA-B36-23: should mostrar no título da coluna a quantidade e a soma do que os clientes já compraram", () => {
    render(
      <ColunaKanban
        titulo="Lead"
        etapaId="lead"
        cards={[
          card("1", "Moda Sol", { totalComprado: 100 }),
          card("2", "Bella Kids", { totalComprado: 250 }),
          card("3", "Rosa", { totalComprado: 0 }),
        ]}
      />
    )
    const coluna = screen.getByRole("region", { name: "Lead" })
    const titulo = coluna.querySelector("header")!
    expect(titulo.querySelector("[data-quantidade]")!.textContent).toBe("3")
    expect(titulo.querySelector("[data-soma]")!.textContent!.replace(/\s/g, " ")).toBe("R$ 350")
    expect(within(coluna).getByText("Moda Sol").closest("[data-card]")!.querySelector("[data-total]")!.textContent!.replace(/\s/g, " ")).toBe("R$ 100")
    expect(within(coluna).getByText("Bella Kids").closest("[data-card]")!.querySelector("[data-total]")!.textContent!.replace(/\s/g, " ")).toBe("R$ 250")
    expect(within(coluna).getByText("Rosa").closest("[data-card]")!.querySelector("[data-total]")!.textContent).toBe("—")
  })

  it("CA-B36-24: should mostrar 'parado 4 dias' em vermelho além do limite e 'há 2 h' em cinza dentro do prazo", () => {
    // O limite é o dos Alertas: no Entrada, o de "lead sem resposta" (3 dias no padrão).
    const limite = limiteDeParado("entrada", "lead", { ...CONFIG_ALERTAS_PADRAO, leadSemRespostaDias: 3 })
    expect(limite).toBe(3)
    expect(situacaoDoCard(new Date(AGORA.getTime() - 4 * 86400000).toISOString(), limite, AGORA)).toEqual({ texto: "parado 4 dias", parado: true })
    expect(situacaoDoCard(new Date(AGORA.getTime() - 2 * 3600000).toISOString(), limite, AGORA)).toEqual({ texto: "há 2 h", parado: false })

    render(
      <ColunaKanban
        titulo="Sondagem"
        etapaId="sondagem"
        cards={[
          card("a", "Parado Há Tempo", { etapaDesde: horasAtras(4 * 24 + 1), limiteParadoDias: 3 }),
          card("b", "Chegou Agora", { etapaDesde: horasAtras(2), limiteParadoDias: 3 }),
        ]}
      />
    )
    const parado = screen.getByText("Parado Há Tempo").closest("[data-card]")!.querySelector("[data-parado]")!
    expect(parado.textContent).toBe("parado 4 dias")
    expect(parado).toHaveClass("text-queda")
    const recente = screen.getByText("Chegou Agora").closest("[data-card]")!
    expect(recente.querySelector("[data-parado]")).toBeNull()
    expect(within(recente as HTMLElement).getByText("há 2 h")).toHaveClass("text-muted-foreground")
  })
})
