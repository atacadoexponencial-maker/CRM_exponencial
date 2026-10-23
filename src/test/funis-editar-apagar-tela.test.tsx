// B41-02 — confirmações na tela de funis: apagar etapa com cards pede o destino (e
// desistir não muda nada), apagar funil avisa quantos cards saem.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/funis/actions", () => ({
  adicionarEtapa: vi.fn(async () => ({})),
  apagarEtapa: vi.fn(async () => ({})),
  apagarFunil: vi.fn(async () => ({ cards: 7 })),
  criarFunil: vi.fn(async () => ({})),
  editarEtapa: vi.fn(async () => ({})),
  moverEtapa: vi.fn(async () => ({})),
  renomearFunil: vi.fn(async () => ({})),
}))

import { FunisClient } from "@/app/(auth)/configuracoes/funis/funis-client"
import { apagarEtapa, apagarFunil, moverEtapa } from "@/app/(auth)/configuracoes/funis/actions"
import type { FunisParaGerenciar } from "@/app/(auth)/configuracoes/funis/actions"

const DADOS: FunisParaGerenciar = {
  fixos: [
    { id: "entrada", nome: "Funil de Entrada", etapas: 8 },
    { id: "recompra", nome: "Funil de Recompra", etapas: 7 },
  ],
  funis: [
    {
      id: "f1",
      nome: "Feira de Março",
      cards: 7,
      etapas: [
        { id: "e1", nome: "Convidado", cor: null, ordem: 0, cards: 3 },
        { id: "e2", nome: "Confirmou", cor: null, ordem: 1, cards: 4 },
        { id: "e3", nome: "Visitou", cor: null, ordem: 2, cards: 0 },
      ],
    },
  ],
}

function abrirEditor() {
  render(<FunisClient dados={DADOS} />)
  fireEvent.click(screen.getByRole("button", { name: "Editar" }))
}

beforeEach(() => vi.clearAllMocks())

describe("B41-02 — Confirmações da tela de funis", () => {
  it("CA-B41-07: should pedir ao servidor para subir a etapa, e não subir a primeira", () => {
    abrirEditor()
    expect((screen.getByRole("button", { name: "Subir Convidado" }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Descer Visitou" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole("button", { name: "Subir Visitou" }))
    expect(moverEtapa).toHaveBeenCalledWith("e3", "subir")
  })

  it("CA-B41-09: should pedir o destino dos 4 cards e não mudar nada ao desistir", () => {
    abrirEditor()
    fireEvent.click(screen.getByRole("button", { name: "Apagar Confirmou" }))
    const caixa = screen.getByRole("group", { name: "Apagar Confirmou" })
    expect(within(caixa).getByText(/4 cards estão nesta etapa/)).toBeTruthy()
    const opcoes = within(caixa).getAllByRole("option").map((o) => o.textContent)
    expect(opcoes).toEqual(["Escolha a etapa", "Convidado", "Visitou"])
    expect((within(caixa).getByRole("button", { name: "Apagar etapa" }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(within(caixa).getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("group", { name: "Apagar Confirmou" })).toBeNull()
    expect(apagarEtapa).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Apagar Confirmou" }))
    const denovo = screen.getByRole("group", { name: "Apagar Confirmou" })
    fireEvent.change(within(denovo).getByRole("combobox"), { target: { value: "e3" } })
    fireEvent.click(within(denovo).getByRole("button", { name: "Apagar etapa" }))
    expect(apagarEtapa).toHaveBeenCalledWith("e2", "e3")
  })

  it("CA-B41-10: should apagar a etapa vazia só com a confirmação", () => {
    abrirEditor()
    fireEvent.click(screen.getByRole("button", { name: "Apagar Visitou" }))
    const caixa = screen.getByRole("group", { name: "Apagar Visitou" })
    expect(within(caixa).queryByRole("combobox")).toBeNull()
    fireEvent.click(within(caixa).getByRole("button", { name: "Apagar etapa" }))
    expect(apagarEtapa).toHaveBeenCalledWith("e3", null)
  })

  it("CA-B41-12: should avisar que 7 cards saem junto antes de apagar o funil", () => {
    render(<FunisClient dados={DADOS} />)
    fireEvent.click(screen.getByRole("button", { name: "Apagar o funil Feira de Março" }))
    const caixa = screen.getByRole("group", { name: "Apagar Feira de Março" })
    expect(caixa.textContent).toContain("7 cards saem junto")
    fireEvent.click(within(caixa).getByRole("button", { name: "Cancelar" }))
    expect(apagarFunil).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Apagar o funil Feira de Março" }))
    fireEvent.click(within(screen.getByRole("group", { name: "Apagar Feira de Março" })).getByRole("button", { name: "Apagar funil" }))
    expect(apagarFunil).toHaveBeenCalledWith("f1")
  })
})
