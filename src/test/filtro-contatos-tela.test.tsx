// B37-01 — painel do filtro avançado na lista de contatos. As actions são
// mockadas: aqui se confere o que a tela mostra e o que ela pede ao servidor.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Contato } from "@/app/(auth)/contatos/mock-contatos"
import type { Filtro } from "@/lib/filtro-contatos"

const filtrarContatos = vi.fn()

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock("@/app/(auth)/contatos/actions", () => ({
  filtrarContatos: (...args: unknown[]) => filtrarContatos(...args),
  verificarNumeroDuplicado: vi.fn(),
  criarContato: vi.fn(),
}))
vi.mock("@/app/(auth)/contatos/lixeira/actions", () => ({ resumoExclusaoContato: vi.fn(), excluirContato: vi.fn() }))

import { ListaContatos } from "@/app/(auth)/contatos/components/lista-contatos"

const contato = (n: number): Contato => ({
  id: `c-${n}`,
  nome: `Contato ${n}`,
  telefone: `55119${String(n).padStart(8, "0")}`,
  classificacao: "lead",
  tipo: null,
  nicho: null,
  cidade: "Fortaleza",
  atendente: null,
  created_at: "2026-10-20T10:00:00Z",
})
const pagina = (de: number, quantos: number) => Array.from({ length: quantos }, (_, i) => contato(de + i))

function renderizar() {
  return render(<ListaContatos contatos={pagina(1, 50)} total={120} nichos={[]} atendentes={[]} papel="admin" />)
}

function abrirPainel() {
  fireEvent.click(screen.getByRole("button", { name: /^Filtrar/ }))
  return screen.getByRole("dialog")
}

function preencherCondicao(painel: HTMLElement, indice: number, campo: string, valor?: string) {
  fireEvent.change(within(painel).getAllByLabelText("Campo")[indice], { target: { value: campo } })
  if (valor !== undefined) {
    fireEvent.change(within(painel).getAllByLabelText("Valor")[indice], { target: { value: valor } })
  }
}

const ultimoFiltro = (): Filtro => filtrarContatos.mock.calls.at(-1)![0].filtro

const textoDoTotal = (texto: string) => (_: string, el: Element | null) => el?.tagName === "P" && el.textContent === texto

beforeEach(() => {
  filtrarContatos.mockReset()
  filtrarContatos.mockImplementation(async (opcoes: { offset?: number }) =>
    opcoes.offset ? { contatos: pagina(51, 50), total: 120 } : { contatos: pagina(1, 50), total: 120 }
  )
})

describe("B37-01 — filtro avançado na lista de contatos", () => {
  it("CA-B37-01: should abrir o painel com um grupo vazio e a opção de acrescentar condição", () => {
    renderizar()
    const painel = abrirPainel()

    expect(within(painel).getByRole("region", { name: "Grupo 1" })).toBeTruthy()
    expect(within(painel).queryByRole("region", { name: "Grupo 2" })).toBeNull()
    expect((within(painel).getByLabelText("Campo") as HTMLSelectElement).value).toBe("")
    expect(within(painel).getByRole("button", { name: /Acrescentar condição/ })).toBeTruthy()
  })

  it("CA-B37-09: should mostrar o total do resultado, mesmo exibindo só os 50 primeiros", async () => {
    renderizar()
    const painel = abrirPainel()
    preencherCondicao(painel, 0, "cidade", "Fortaleza")
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))

    await waitFor(() => expect(screen.getByText(textoDoTotal("120 contatos encontrados"))).toBeTruthy())
    expect(screen.getAllByText(/^Contato \d+$/)).toHaveLength(50)
  })

  it("CA-B37-10: should carregar a página seguinte com o mesmo filtro", async () => {
    renderizar()
    const painel = abrirPainel()
    preencherCondicao(painel, 0, "cidade", "Fortaleza")
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))
    await waitFor(() => expect(filtrarContatos).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole("button", { name: "Carregar mais" })).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }))

    await waitFor(() => expect(filtrarContatos).toHaveBeenCalledTimes(2))
    const [primeiro, segundo] = filtrarContatos.mock.calls.map((c) => c[0])
    expect(segundo.offset).toBe(50)
    expect(segundo.filtro).toEqual(primeiro.filtro)
    expect(segundo.filtro.grupos[0].condicoes).toEqual([{ campo: "cidade", comparacao: "contem", valores: ["Fortaleza"] }])
    await waitFor(() => expect(screen.getByText("Contato 51")).toBeTruthy())
  })

  it("CA-B37-11: should aplicar só a condição que ficou depois de remover a outra", async () => {
    renderizar()
    let painel = abrirPainel()
    preencherCondicao(painel, 0, "cidade", "Fortaleza")
    fireEvent.click(within(painel).getByRole("button", { name: /Acrescentar condição/ }))
    preencherCondicao(painel, 1, "nome", "Maria")
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))
    await waitFor(() => expect(ultimoFiltro().grupos[0].condicoes).toHaveLength(2))

    painel = abrirPainel()
    fireEvent.click(within(painel).getAllByRole("button", { name: "Remover condição" })[0])
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))

    await waitFor(() =>
      expect(ultimoFiltro().grupos[0].condicoes).toEqual([{ campo: "nome", comparacao: "contem", valores: ["Maria"] }])
    )
  })

  it("CA-B37-12: should voltar à lista completa e ao botão sem número ao limpar o filtro", async () => {
    renderizar()
    const painel = abrirPainel()
    preencherCondicao(painel, 0, "cidade", "Fortaleza")
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Filtrar · 1" })).toBeTruthy())

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro" }))

    await waitFor(() => expect(ultimoFiltro().grupos).toEqual([]))
    expect(screen.getByRole("button", { name: "Filtrar" })).toBeTruthy()
    await waitFor(() => expect(screen.getByText(textoDoTotal("120 contatos"))).toBeTruthy())
  })

  it("CA-B37-13: should marcar a condição sem valor como incompleta e não filtrar por ela", async () => {
    renderizar()
    const painel = abrirPainel()
    preencherCondicao(painel, 0, "cidade")
    expect(within(painel).getByText("Incompleta")).toBeTruthy()

    fireEvent.click(within(painel).getByRole("button", { name: /Acrescentar condição/ }))
    preencherCondicao(painel, 1, "nome", "Ana")
    fireEvent.click(within(painel).getByRole("button", { name: "Aplicar" }))

    await waitFor(() => expect(filtrarContatos).toHaveBeenCalled())
    expect(ultimoFiltro().grupos[0].condicoes).toEqual([{ campo: "nome", comparacao: "contem", valores: ["Ana"] }])
    expect(screen.getByRole("button", { name: "Filtrar · 1" })).toBeTruthy()
  })

  it("CA-B37-36: should oferecer 'está vazio' só em campo que não é obrigatório", () => {
    renderizar()
    const painel = abrirPainel()
    const opcoes = () =>
      Array.from((within(painel).getByLabelText("Comparação") as HTMLSelectElement).options).map((o) => o.textContent)

    preencherCondicao(painel, 0, "cidade")
    expect(opcoes()).toEqual(expect.arrayContaining(["está vazio", "não está vazio"]))

    preencherCondicao(painel, 0, "telefone")
    expect(opcoes()).not.toContain("está vazio")
    expect(opcoes()).not.toContain("não está vazio")
  })
})
