// B37-03 — faixa de filtros salvos na lista de contatos. As actions são mockadas:
// aqui se confere o que a tela mostra e o que ela pede ao servidor.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Contato } from "@/app/(auth)/contatos/mock-contatos"
import type { Filtro } from "@/lib/filtro-contatos"
import type { FiltroSalvo } from "@/app/(auth)/contatos/filtros-salvos"

const filtrarContatos = vi.fn()
const apagarFiltroSalvo = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  filtrarContatos: (...args: unknown[]) => filtrarContatos(...args),
  verificarNumeroDuplicado: vi.fn(),
  criarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/filtros-salvos", () => ({
  salvarFiltro: vi.fn(),
  atualizarFiltroSalvo: vi.fn(),
  renomearFiltroSalvo: vi.fn(),
  moverFiltroSalvo: vi.fn(),
  apagarFiltroSalvo: (...args: unknown[]) => apagarFiltroSalvo(...args),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn() }))

import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"

const contato = (n: number): Contato => ({
  id: `c-${n}`,
  nome: `Contato ${n}`,
  telefone: `55119${String(n).padStart(8, "0")}`,
  classificacao: "lead",
  tipo: "lojista",
  cidade: "Fortaleza",
  atendente: null,
  created_at: "2026-10-20T10:00:00Z",
})

const LOJISTAS: Filtro = {
  juncao: "e",
  grupos: [
    {
      juncao: "e",
      condicoes: [
        { campo: "cidade", comparacao: "igual", valores: ["Fortaleza"] },
        { campo: "tipo", comparacao: "e", valores: ["lojista"] },
      ],
    },
  ],
}
const SALVO: FiltroSalvo = { id: "s1", nome: "Lojistas de Fortaleza", filtro: LOJISTAS }

function renderizar(papel = "admin", filtrosSalvos: FiltroSalvo[] = [SALVO], etiquetas: string[] = []) {
  return render(
    <ListaContatos
      contatos={[contato(1), contato(2)]}
      total={120}
      atendentes={[]}
      etiquetas={etiquetas}
      filtrosSalvos={filtrosSalvos}
      papel={papel}
    />
  )
}

const botaoDoSalvo = (nome = "Lojistas de Fortaleza") => screen.getByRole("button", { name: nome })
const ultimaConsulta = () => filtrarContatos.mock.calls.at(-1)![0]
const textoDoTotal = (texto: string) => (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === texto

beforeEach(() => {
  filtrarContatos.mockReset()
  filtrarContatos.mockResolvedValue({ contatos: [contato(1)], total: 37 })
  apagarFiltroSalvo.mockReset()
  apagarFiltroSalvo.mockResolvedValue({ filtros: [] })
})

describe("B37-03 — filtros salvos na lista de contatos", () => {
  it("CA-B37-25: should aplicar o filtro salvo com um clique, marcar o botão e mostrar a contagem", async () => {
    renderizar()
    expect(botaoDoSalvo().getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(botaoDoSalvo())

    await waitFor(() => expect(filtrarContatos).toHaveBeenCalled())
    expect(ultimaConsulta().filtro).toEqual(LOJISTAS)
    expect(botaoDoSalvo().getAttribute("aria-pressed")).toBe("true")
    await waitFor(() => expect(screen.getByText(textoDoTotal("37 contatos encontrados"))).toBeTruthy())
  })

  it("CA-B37-26: should desligar o filtro salvo ao clicar de novo", async () => {
    renderizar()
    fireEvent.click(botaoDoSalvo())
    await waitFor(() => expect(filtrarContatos).toHaveBeenCalledTimes(1))

    fireEvent.click(botaoDoSalvo())

    await waitFor(() => expect(filtrarContatos).toHaveBeenCalledTimes(2))
    expect(ultimaConsulta().filtro.grupos).toEqual([])
    expect(botaoDoSalvo().getAttribute("aria-pressed")).toBe("false")
  })

  it("CA-B37-29: should pedir confirmação antes de apagar o filtro salvo", async () => {
    renderizar()
    const abrirApagar = () => {
      fireEvent.click(screen.getByRole("button", { name: "Opções do filtro Lojistas de Fortaleza" }))
      fireEvent.click(screen.getByRole("menuitem", { name: "Apagar" }))
      return screen.getByRole("dialog")
    }

    fireEvent.click(within(abrirApagar()).getByRole("button", { name: "Cancelar" }))
    expect(apagarFiltroSalvo).not.toHaveBeenCalled()
    expect(botaoDoSalvo()).toBeTruthy()

    fireEvent.click(within(abrirApagar()).getByRole("button", { name: "Apagar" }))

    await waitFor(() => expect(apagarFiltroSalvo).toHaveBeenCalledWith("s1"))
    await waitFor(() => expect(screen.queryByRole("button", { name: "Lojistas de Fortaleza" })).toBeNull())
  })

  it("CA-B37-31: should deixar o Atendente usar o filtro salvo sem salvar, renomear ou apagar", async () => {
    renderizar("atendente")
    expect(screen.queryByRole("button", { name: /Opções do filtro/ })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))
    const painel = screen.getByRole("dialog")
    expect(within(painel).queryByRole("button", { name: "Salvar filtro" })).toBeNull()
    expect(within(painel).queryByRole("button", { name: "Atualizar filtro salvo" })).toBeNull()
    fireEvent.click(within(painel).getByRole("button", { name: "Fechar" }))

    fireEvent.click(botaoDoSalvo())
    await waitFor(() => expect(filtrarContatos).toHaveBeenCalled())
    expect(ultimaConsulta().filtro).toEqual(LOJISTAS)
  })

  it("CA-B37-33: should marcar no painel a condição cujo valor não existe mais", () => {
    const comVip: FiltroSalvo = {
      id: "s2",
      nome: "Com VIP",
      filtro: { juncao: "e", grupos: [{ juncao: "e", condicoes: [{ campo: "etiqueta", comparacao: "tem", valores: ["vip"] }] }] },
    }
    renderizar("admin", [comVip], ["atacado"])
    fireEvent.click(botaoDoSalvo("Com VIP"))
    fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))

    const painel = screen.getByRole("dialog")
    expect(within(painel).getByText("Valor não existe mais")).toBeTruthy()
    expect(within(painel).queryByText("Incompleta")).toBeNull()
  })

  it("CA-B37-34: should valer o filtro salvo junto com os botões fixos, que continuam", async () => {
    renderizar()
    expect(screen.getByRole("button", { name: "Todas" })).toBeTruthy()
    // B46-11: tipo e atendente ficam atrás de "Mais filtros"
    fireEvent.click(screen.getByRole("button", { name: "Mais filtros" }))
    expect(screen.getByRole("button", { name: "Lojista" })).toBeTruthy()

    fireEvent.click(botaoDoSalvo())
    fireEvent.click(screen.getByRole("button", { name: "Ativo" }))

    await waitFor(() =>
      expect(ultimaConsulta().rapidos).toEqual([{ campo: "classificacao", comparacao: "e", valores: ["ativo"] }])
    )
    expect(ultimaConsulta().filtro).toEqual(LOJISTAS)
  })

  it("CA-B37-34: should esconder a faixa quando a empresa não tem filtro salvo", () => {
    renderizar("admin", [])
    expect(screen.queryByRole("group", { name: "Filtros salvos" })).toBeNull()
    expect(screen.getByRole("button", { name: "Ativo" })).toBeTruthy()
  })
})
