// B61-05 — Lista única de produtos que carrega ao rolar (modelo "grade").
// Testes de tela da vitrine: lista sem títulos de categoria, carga de 24 em 24, filtros
// sobre a lista inteira, volta do produto e os modelos "lista" e "destaque" como antes.

import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { TEMA_PADRAO, type LayoutVitrine, type TemaLoja } from "@/app/loja/components/tema"

const CATEGORIAS: CategoriaVitrine[] = [
  { id: "blusas", nome: "Blusas", fotoUrl: null, subcategorias: [] },
  { id: "calcas", nome: "Calças", fotoUrl: null, subcategorias: [] },
]
const tema = (layout: LayoutVitrine): TemaLoja => ({ ...TEMA_PADRAO, nomeLoja: "Loja Teste", layout })

function produto(id: string, nome: string, parcial: Partial<ProdutoVitrine> = {}): ProdutoVitrine {
  return {
    id, nome, descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null, fotoUrl: null,
    categoriaId: "blusas", subcategoriaId: null, destaque: false, variacoes: null, opcoes: [], outrasOpcoes: null, esgotado: false, ultimasUnidades: false, ...parcial,
  }
}
const numero = (n: number) => String(n).padStart(2, "0")
/** 60 produtos "Produto 01" a "Produto 60", na ordem do lojista. */
function sessenta(ajuste: (n: number) => Partial<ProdutoVitrine> = () => ({})): ProdutoVitrine[] {
  return Array.from({ length: 60 }, (_, i) => produto(`p${i + 1}`, `Produto ${numero(i + 1)}`, ajuste(i + 1)))
}

// O jsdom não tem IntersectionObserver: aqui ele guarda quem está sendo observado, e o
// teste diz quando o fim da lista chegou à tela (é o que a rolagem faz no navegador).
let observadores: { chamar: IntersectionObserverCallback; alvos: Element[] }[] = []
class ObservadorDeTeste {
  private registro: { chamar: IntersectionObserverCallback; alvos: Element[] }
  constructor(chamar: IntersectionObserverCallback) {
    this.registro = { chamar, alvos: [] }
    observadores.push(this.registro)
  }
  observe(alvo: Element) { this.registro.alvos.push(alvo) }
  unobserve() {}
  disconnect() { observadores = observadores.filter((o) => o !== this.registro) }
}
/** A cliente rolou até o fim do que está carregado. */
function rolarAteOFim(container: HTMLElement) {
  const marco = container.querySelector("[data-fim-da-lista]")
  expect(marco, "o marco do fim da lista existe").not.toBeNull()
  const observando = observadores.filter((o) => o.alvos.includes(marco!))
  expect(observando.length, "o fim da lista está sendo observado").toBeGreaterThan(0)
  act(() => {
    for (const o of observando) o.chamar([{ isIntersecting: true, target: marco! } as IntersectionObserverEntry], o as unknown as IntersectionObserver)
  })
}

function abrirLoja(layout: LayoutVitrine, produtos: ProdutoVitrine[], extras: Partial<Parameters<typeof Vitrine>[0]> = {}) {
  const tela = render(<Vitrine tema={tema(layout)} categorias={CATEGORIAS} produtos={produtos} hrefLoja="/loja/loja-teste" {...extras} />)
  const naTela = (nome: string) => tela.container.textContent?.includes(nome) ?? false
  return { ...tela, naTela }
}
const cartoes = (container: HTMLElement) => container.querySelectorAll("[data-cartao-retrato]")

beforeEach(() => {
  observadores = []
  sessionStorage.clear()
  vi.stubGlobal("IntersectionObserver", ObservadorDeTeste)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// Telas com 60 cartões: no jsdom a montagem passa dos 5 segundos padrão em máquina ocupada.
describe("B61-05 — lista única no modelo 'grade'", { timeout: 30_000 }, () => {
  it("CA-B61-34: produtos de duas categorias e sem categoria aparecem em uma lista só, na ordem do lojista, sem títulos de categoria nem 'Mais produtos'", () => {
    const produtos = [
      produto("a", "Blusa azul", { categoriaId: "blusas" }),
      produto("b", "Cinto solto", { categoriaId: null }),
      produto("c", "Calça reta", { categoriaId: "calcas" }),
      produto("d", "Blusa branca", { categoriaId: "blusas" }),
      produto("e", "Lenço solto", { categoriaId: null }),
    ]
    const { container } = abrirLoja("grade", produtos)

    const listas = container.querySelectorAll("[data-lista-produtos]")
    expect(listas).toHaveLength(1)
    const naLista = [...listas[0].querySelectorAll("[data-cartao-retrato]")].map((c) => c.textContent)
    // A ordem do lojista, e não agrupada por categoria.
    expect(naLista.map((t) => produtos.find((p) => t?.includes(p.nome))?.nome)).toEqual(["Blusa azul", "Cinto solto", "Calça reta", "Blusa branca", "Lenço solto"])

    expect(screen.queryByRole("heading", { name: "Blusas" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Calças" })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Mais produtos" })).toBeNull()
    expect(container.textContent).not.toContain("Mais produtos")
  })

  it("CA-B61-35: com 60 produtos, aparecem 24 e, ao rolar até o fim deles, mais 24 chegam sem toque; não existe 'Ver mais'", () => {
    const { container, naTela } = abrirLoja("grade", sessenta())
    expect(cartoes(container)).toHaveLength(24)
    expect(naTela("Produto 24")).toBe(true)
    expect(naTela("Produto 25")).toBe(false)
    expect(screen.queryByRole("button", { name: /Ver mais/ })).toBeNull()

    rolarAteOFim(container)
    expect(cartoes(container)).toHaveLength(48)
    expect(naTela("Produto 48")).toBe(true)
    expect(naTela("Produto 49")).toBe(false)

    rolarAteOFim(container)
    expect(cartoes(container)).toHaveLength(60)
    // Acabou a lista: não há mais o que carregar nem botão para isso.
    expect(container.querySelector("[data-fim-da-lista]")).toBeNull()
    expect(screen.queryByRole("button", { name: /Ver mais/ })).toBeNull()
  })

  it("CA-B61-36: busca, ordenação e 'Só com estoque' valem para a lista inteira, sem a cliente ter rolado", () => {
    // Só o 50º tem "veludo"; os 30 primeiros estão esgotados; o 60º é o mais barato.
    const produtos = sessenta((n) => ({
      ...(n === 50 ? { nome: "Calça de veludo" } : {}),
      esgotado: n <= 30,
      preco: n === 60 ? 1 : 10,
    }))
    const { container, naTela } = abrirLoja("grade", produtos)
    expect(cartoes(container)).toHaveLength(24)
    expect(naTela("Calça de veludo")).toBe(false)

    fireEvent.change(screen.getByLabelText("Buscar produto"), { target: { value: "veludo" } })
    expect(cartoes(container)).toHaveLength(1)
    expect(naTela("Calça de veludo")).toBe(true)
    fireEvent.change(screen.getByLabelText("Buscar produto"), { target: { value: "" } })

    // Ordenar pelo menor preço traz o 60º para o começo.
    expect(naTela("Produto 60")).toBe(false)
    fireEvent.change(screen.getByLabelText("Ordenar produtos"), { target: { value: "menor-preco" } })
    expect(cartoes(container)[0].textContent).toContain("Produto 60")
    fireEvent.change(screen.getByLabelText("Ordenar produtos"), { target: { value: "loja" } })

    // "Só com estoque" mostra do 31º em diante, que estavam além dos 24 primeiros.
    expect(naTela("Produto 31")).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: "Só com estoque" }))
    expect(cartoes(container)).toHaveLength(24)
    expect(cartoes(container)[0].textContent).toContain("Produto 31")
    expect(naTela("Produto 30")).toBe(false)
  })

  it("CA-B61-37: voltar do produto devolve a lista com 'Blusas' escolhida, o 40º produto carregado e a mesma altura da tela", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    const rolarPara = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    // 60 blusas e, intercaladas no começo, calças: com "Blusas" escolhida, o 40º é "Produto 40".
    const produtos = [produto("c1", "Calça um", { categoriaId: "calcas" }), ...sessenta()]
    const hrefProduto = (id: string) => `/loja/loja-teste/p/${id}`

    const ida = abrirLoja("grade", produtos, { hrefProduto })
    fireEvent.click(within(screen.getByRole("navigation", { name: "Categorias" })).getByRole("button", { name: "Blusas" }))
    expect(ida.naTela("Produto 40")).toBe(false)
    rolarAteOFim(ida.container)
    expect(ida.naTela("Produto 40")).toBe(true)
    Object.defineProperty(window, "scrollY", { value: 3210, configurable: true })
    // Ela toca no 40º produto: o link leva à página dele.
    const quadragesimo = [...cartoes(ida.container)].find((c) => c.textContent?.includes("Produto 40"))!
    expect(quadragesimo.closest("a")?.getAttribute("href")).toBe("/loja/loja-teste/p/p40")
    fireEvent.click(quadragesimo)
    ida.unmount()
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true })
    expect(rolarPara).not.toHaveBeenCalled()

    // Ela volta: a vitrine abre de novo, do zero.
    const volta = abrirLoja("grade", produtos, { hrefProduto })
    await act(async () => { await new Promise((pronto) => setTimeout(pronto, 80)) })

    expect(within(screen.getByRole("navigation", { name: "Categorias" })).getByRole("button", { name: "Blusas" }).getAttribute("aria-pressed")).toBe("true")
    expect(volta.naTela("Calça um")).toBe(false)
    expect(cartoes(volta.container)).toHaveLength(48)
    expect(volta.naTela("Produto 40")).toBe(true)
    expect(rolarPara).toHaveBeenCalledWith(0, 3210)
  })
})

describe("B61-05 — 'lista' e 'destaque' como antes", { timeout: 30_000 }, () => {
  it("CA-B61-38: nos modelos 'lista' e 'destaque' os produtos seguem em seções por categoria, com os cartões e o 'Ver mais' de antes, abaixo do topo, dos círculos e da faixa", () => {
    const produtos = [
      ...Array.from({ length: 30 }, (_, i) => produto(`b${i + 1}`, `Blusa ${numero(i + 1)}`, { categoriaId: "blusas", destaque: i === 0 })),
      produto("c1", "Calça reta", { categoriaId: "calcas" }),
      produto("s1", "Cinto solto", { categoriaId: null }),
    ]
    for (const layout of ["lista", "destaque"] as const) {
      const { container, unmount } = abrirLoja(layout, produtos, { avisoMinimo: "Mínimo 12 peças" })

      // Seções por categoria, na ordem do lojista, e os sem categoria em "Mais produtos".
      const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
      expect(titulos.filter((t) => t !== "Destaques"), layout).toEqual(["Blusas", "Calças", "Mais produtos"])
      // Seção longa mostra 24 e o "Ver mais" com o resto.
      expect(screen.getByRole("button", { name: "Ver mais 6 produtos de Blusas" }), layout).toBeTruthy()
      expect(container.textContent?.includes("Blusa 24"), layout).toBe(true)
      expect(container.textContent?.includes("Blusa 25"), layout).toBe(false)
      // Os cartões são os de antes: linha com foto pequena em "lista", cartão de foto quadrada
      // em "destaque" (24 de Blusas, 1 de Calças e 1 sem categoria), e só nele a faixa de destaques.
      const linhasDaLista = container.querySelectorAll(".size-24.rounded-lg.overflow-hidden")
      const cartoesQuadrados = container.querySelectorAll(".aspect-square.overflow-hidden")
      const cartoesDeDestaque = container.querySelectorAll(".w-56 .overflow-hidden")
      expect(linhasDaLista.length, layout).toBe(layout === "lista" ? 26 : 0)
      expect(cartoesQuadrados.length, layout).toBe(layout === "destaque" ? 26 : 0)
      expect(cartoesDeDestaque.length, layout).toBe(layout === "destaque" ? 1 : 0)
      // Nada do cartão em retrato nem da lista única.
      expect(container.querySelector("[data-cartao-retrato]"), layout).toBeNull()
      expect(container.querySelector("[data-lista-produtos]"), layout).toBeNull()
      expect(container.querySelector("[data-fim-da-lista]"), layout).toBeNull()

      // Tudo isso abaixo do topo, dos círculos de categoria e da faixa do atacado.
      const topo = container.querySelector("[data-topo-loja]")!
      const circulo = container.querySelector("[data-circulo-categoria]")!
      const faixa = container.querySelector("[data-faixa-atacado]")!
      const primeiraSecao = screen.getByRole("heading", { level: 2, name: "Blusas" })
      for (const acima of [topo, circulo, faixa]) {
        expect(acima, layout).not.toBeNull()
        expect(Boolean(acima.compareDocumentPosition(primeiraSecao) & Node.DOCUMENT_POSITION_FOLLOWING), layout).toBe(true)
      }
      unmount()
    }
  })
})
