// B38-06 — apagar campo e tirar opção na tela: o aviso de quantos contatos perdem o
// valor, o "Usado em" pelo nome de cada coisa e a confirmação. As actions ficam
// mockadas; o servidor é conferido em campos-personalizados-apagar.integration.test.ts.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { CampoParaGerenciar } from "@/app/(auth)/configuracoes/campos/actions"

const resumoParaApagar = vi.fn()
const apagarCampo = vi.fn()
const tirarOpcao = vi.fn()
const refresh = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }))
vi.mock("@/app/(auth)/configuracoes/campos/actions", () => ({
  resumoParaApagar: (...a: unknown[]) => resumoParaApagar(...a),
  apagarCampo: (...a: unknown[]) => apagarCampo(...a),
  tirarOpcao: (...a: unknown[]) => tirarOpcao(...a),
  adicionarOpcao: vi.fn(),
  criarCampo: vi.fn(),
  marcarNaLista: vi.fn(),
  moverCampo: vi.fn(),
  moverOpcao: vi.fn(),
  renomearCampo: vi.fn(),
  renomearOpcao: vi.fn(),
}))

import { CamposClient } from "@/app/(auth)/configuracoes/campos/campos-client"

const NADA = { automacoes: [], filtros: [], campanhas: [] }
const PORTE: CampoParaGerenciar = {
  id: "p", nome: "Porte", tipo: "lista", ordem: 0, mostrarNaLista: false, preenchidos: 5,
  opcoes: [{ id: "o-p", nome: "Pequeno", ordem: 0 }, { id: "o-r", nome: "Rede", ordem: 1 }],
}
const ANIVERSARIO: CampoParaGerenciar = { id: "a", nome: "Aniversário da loja", tipo: "data", ordem: 1, mostrarNaLista: false, preenchidos: 4, opcoes: [] }

beforeEach(() => {
  resumoParaApagar.mockReset()
  apagarCampo.mockReset()
  tirarOpcao.mockReset()
  refresh.mockReset()
})

describe("B38-06 — apagar campo e tirar opção na tela", () => {
  it("CA-B38-12: should avisar quantos contatos perdem o valor, apagar ao confirmar e não mudar nada ao desistir", async () => {
    resumoParaApagar.mockResolvedValue({ preenchidos: 4, usadoEm: NADA })
    apagarCampo.mockResolvedValue({})
    render(<CamposClient campos={[PORTE, ANIVERSARIO]} />)

    fireEvent.click(screen.getByRole("button", { name: "Apagar o campo Aniversário da loja" }))
    const aviso = await screen.findByRole("alertdialog", { name: "Apagar o campo Aniversário da loja" })
    expect(await within(aviso).findByText("4 contatos perdem este valor.")).toBeInTheDocument()
    fireEvent.click(within(aviso).getByRole("button", { name: "Cancelar" }))
    expect(apagarCampo).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Apagar o campo Aniversário da loja" }))
    fireEvent.click(await screen.findByRole("button", { name: "Apagar campo" }))
    await waitFor(() => expect(apagarCampo).toHaveBeenCalledWith("a"))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("CA-B38-13: should mostrar Usado em pelo nome e não oferecer apagar o campo em uso", async () => {
    resumoParaApagar.mockResolvedValue({
      preenchidos: 5,
      usadoEm: { automacoes: ["Boas-vindas atacado"], filtros: ["Lojas grandes"], campanhas: ["Promoção de março"] },
    })
    render(<CamposClient campos={[PORTE]} />)
    fireEvent.click(screen.getByRole("button", { name: "Apagar o campo Porte" }))
    const aviso = await screen.findByRole("alertdialog", { name: "Apagar o campo Porte" })
    expect(await within(aviso).findByRole("list", { name: "Automações" })).toHaveTextContent("Boas-vindas atacado")
    expect(within(aviso).getByRole("list", { name: "Filtros salvos" })).toHaveTextContent("Lojas grandes")
    expect(within(aviso).getByRole("list", { name: "Campanhas não enviadas" })).toHaveTextContent("Promoção de março")
    expect(within(aviso).queryByRole("button", { name: "Apagar campo" })).toBeNull()
  })

  it("CA-B38-10: should avisar quantos contatos perdem a opção e tirar ao confirmar", async () => {
    resumoParaApagar.mockResolvedValue({ preenchidos: 3, usadoEm: NADA })
    tirarOpcao.mockResolvedValue({})
    render(<CamposClient campos={[PORTE]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    fireEvent.click(screen.getByRole("button", { name: "Tirar a opção Rede" }))
    const aviso = await screen.findByRole("alertdialog", { name: "Tirar a opção Rede" })
    expect(await within(aviso).findByText("3 contatos perdem esta opção.")).toBeInTheDocument()
    fireEvent.click(within(aviso).getByRole("button", { name: "Tirar opção" }))
    await waitFor(() => expect(tirarOpcao).toHaveBeenCalledWith("p", "o-r"))
  })

  it("CA-B38-45: should mostrar Usado em e não oferecer tirar a opção em uso", async () => {
    resumoParaApagar.mockResolvedValue({ preenchidos: 0, usadoEm: { automacoes: ["Atacado em rede"], filtros: [], campanhas: [] } })
    render(<CamposClient campos={[PORTE]} />)
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    fireEvent.click(screen.getByRole("button", { name: "Tirar a opção Rede" }))
    const aviso = await screen.findByRole("alertdialog", { name: "Tirar a opção Rede" })
    expect(await within(aviso).findByRole("list", { name: "Automações" })).toHaveTextContent("Atacado em rede")
    expect(within(aviso).queryByRole("button", { name: "Tirar opção" })).toBeNull()
  })
})
