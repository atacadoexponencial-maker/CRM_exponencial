// B41-06 — na tela: o gráfico de funil do Dashboard abre em Entrada e troca para o
// funil da empresa escolhido; o filtro de contatos oferece o campo do funil e avisa
// quando a etapa ou o funil do filtro salvo não existe mais.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/(auth)/agenda/actions", () => ({ marcarLembreteFeito: vi.fn() }))

import { BlocoFunilEntrada } from "@/app/(auth)/dashboard/components/blocos-do-dia"
import { PainelFiltro } from "@/app/(auth)/contatos/components/painel-filtro"
import { campoDoFunil, type Filtro, type FunilParaFiltro } from "@/lib/filtro-contatos"

const FEIRA = "11111111-1111-4111-8111-111111111111"
const APAGADO = "22222222-2222-4222-8222-222222222222"

const ENTRADA = [
  { id: "lead", label: "Lead", quantidade: 4 },
  { id: "ganho", label: "Ganho", quantidade: 1 },
]
const OUTROS = [{ id: FEIRA, nome: "Feira de Março", etapas: [{ id: "e1", label: "Convidado", quantidade: 2 }, { id: "e2", label: "Confirmou", quantidade: 5 }] }]
const FUNIS: FunilParaFiltro[] = [{ id: FEIRA, nome: "Feira de Março", etapas: [{ valor: "e1", rotulo: "Convidado" }, { valor: "e2", rotulo: "Confirmou" }] }]

const linhas = (secao: HTMLElement) =>
  Array.from(secao.querySelectorAll("li[data-etapa]")).map((li) => [li.querySelector("span")!.textContent, li.querySelector("[data-quantidade]")!.textContent])

function abrirFiltro(filtro: Filtro) {
  render(
    <PainelFiltro aberto onAbertoChange={vi.fn()} filtro={filtro} atendentes={[]} etiquetas={[]} funis={FUNIS} onAplicar={vi.fn()} onLimpar={vi.fn()} />
  )
}

const com = (campo: string, comparacao: string, valores: string[]): Filtro => ({
  juncao: "e",
  grupos: [{ juncao: "e", condicoes: [{ campo, comparacao: comparacao as never, valores }] }],
})

describe("B41-06 — Funis da empresa no Dashboard e no filtro (tela)", () => {
  it("CA-B41-37: should abrir o gráfico em Entrada e trocar para o funil escolhido, com o link do quadro", () => {
    render(<BlocoFunilEntrada etapas={ENTRADA} outros={OUTROS} />)
    const entrada = screen.getByRole("region", { name: "Funil de Entrada" })
    expect(linhas(entrada)).toEqual([["Lead", "4"], ["Ganho", "1"]])
    expect(within(entrada).getByRole("link", { name: "Abrir pipeline" }).getAttribute("href")).toBe("/pipeline")

    fireEvent.change(screen.getByRole("combobox", { name: "Funil do gráfico" }), { target: { value: FEIRA } })
    const feira = screen.getByRole("region", { name: "Feira de Março" })
    expect(linhas(feira)).toEqual([["Convidado", "2"], ["Confirmou", "5"]])
    expect(within(feira).getByRole("link", { name: "Abrir pipeline" }).getAttribute("href")).toBe(`/pipeline/funil/${FEIRA}`)
  })

  it("CA-B41-37: should mostrar o gráfico sem seletor quando a empresa não tem funil próprio", () => {
    render(<BlocoFunilEntrada etapas={ENTRADA} />)
    expect(screen.queryByRole("combobox", { name: "Funil do gráfico" })).toBeNull()
  })

  it("CA-B41-39: should oferecer o campo do funil da empresa com as etapas dele", () => {
    abrirFiltro(com(campoDoFunil(FEIRA), "na_etapa", ["e2"]))
    const campo = screen.getByRole("combobox", { name: "Campo" }) as HTMLSelectElement
    expect(within(campo).getByRole("option", { name: "Etapa no funil Feira de Março" })).toBeTruthy()
    expect(campo.value).toBe(campoDoFunil(FEIRA))
    expect(screen.queryByText("Valor não existe mais")).toBeNull()
  })

  it("CA-B41-40: should avisar \"Valor não existe mais\" com etapa ou funil apagado", () => {
    const { unmount } = render(
      <PainelFiltro aberto onAbertoChange={vi.fn()} filtro={com(campoDoFunil(FEIRA), "na_etapa", ["etapa-apagada"])} atendentes={[]} etiquetas={[]} funis={FUNIS} onAplicar={vi.fn()} onLimpar={vi.fn()} />
    )
    expect(screen.getByText("Valor não existe mais")).toBeTruthy()
    unmount()
    abrirFiltro(com(campoDoFunil(APAGADO), "no_funil", []))
    expect(screen.getByText("Valor não existe mais")).toBeTruthy()
  })
})
