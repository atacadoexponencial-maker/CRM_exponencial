// B61-02 — Categorias em círculos com foto e faixa do atacado.
// Testes de tela: a vitrine como a cliente vê e a foto no painel de categorias.
// O que o servidor grava, recusa e entrega está em src/test/loja-categorias-foto.integration.test.ts.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/catalogo" }))

const enviarAoArmazenamento = vi.fn()
vi.mock("@/integrations/supabase/client", () => ({ createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: enviarAoArmazenamento }) } }) }))
vi.mock("@/app/(auth)/catalogo/actions", () => ({
  alternarVisivel: vi.fn(), criarCategoria: vi.fn(), excluirCategoria: vi.fn(), renomearCategoria: vi.fn(), reordenarCategoria: vi.fn(), reordenarProduto: vi.fn(),
  prepararEnvioFotoCategoria: vi.fn(),
  salvarFotoCategoria: vi.fn(),
}))

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { minimoDaFaixa } from "@/app/loja/components/pedido"
import { resumoDoDesconto } from "@/lib/catalogo/regras-de-venda"
import { TEMA_PADRAO } from "@/app/loja/components/tema"
import { ProdutosClient } from "@/app/(auth)/catalogo/produtos-client"
import { prepararEnvioFotoCategoria, salvarFotoCategoria, type Catalogo } from "@/app/(auth)/catalogo/actions"

const preparar = vi.mocked(prepararEnvioFotoCategoria)
const salvarFoto = vi.mocked(salvarFotoCategoria)

const FOTO_BLUSAS = "https://exemplo.test/categoria-blusas.jpg"
const FOTO_CALCA = "https://exemplo.test/produto-calca-1.jpg"
const tema = { ...TEMA_PADRAO, nomeLoja: "Loja Teste" }

function produto(id: string, nome: string, categoriaId: string | null, parcial: Partial<ProdutoVitrine> = {}): ProdutoVitrine {
  return { id, nome, descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null, fotoUrl: null, categoriaId, destaque: false, variacoes: null, esgotado: false, ...parcial }
}

const CATEGORIAS: CategoriaVitrine[] = [
  { id: "blusas", nome: "Blusas", fotoUrl: FOTO_BLUSAS },
  { id: "calcas", nome: "Calças", fotoUrl: FOTO_CALCA },
  { id: "acessorios", nome: "Acessórios", fotoUrl: null },
]
const PRODUTOS = [
  produto("p1", "Blusa de linho", "blusas"),
  produto("p2", "Blusa de seda", "blusas"),
  produto("p3", "Calça jeans", "calcas", { fotoUrl: FOTO_CALCA }),
  produto("p4", "Cinto de couro", "acessorios"),
]

function abrirLoja(extras: Partial<Parameters<typeof Vitrine>[0]> = {}) {
  const tela = render(<Vitrine tema={tema} categorias={CATEGORIAS} produtos={PRODUTOS} hrefLoja="/loja/loja-teste" hrefProduto={(id) => `/loja/loja-teste/p/${id}`} {...extras} />)
  const circulos = () => screen.queryByRole("navigation", { name: "Categorias em fotos" })
  const chips = () => screen.queryByRole("navigation", { name: "Categorias" })
  const faixa = () => tela.container.querySelector<HTMLElement>("[data-faixa-atacado]")
  const nomesDosProdutos = () => [...tela.container.querySelectorAll('a[href^="/loja/loja-teste/p/"]')].map((a) => a.querySelector("p")?.textContent)
  return { ...tela, circulos, chips, faixa, nomesDosProdutos }
}

/** `a` vem antes de `b` na página. */
function antes(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}
/** O espaço do "R$ 300,00" vem como espaço que não quebra. */
const texto = (el: Element | null) => (el?.textContent ?? "").replace(/ /g, " ")

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => {
  sessionStorage.clear()
})
afterEach(() => {
  vi.clearAllMocks()
})

describe("B61-02 — círculos de categoria na vitrine", () => {
  it("CA-B61-11: cada categoria aparece em um círculo com a foto que a loja entregou e o nome", () => {
    const { circulos } = abrirLoja()
    const botoes = within(circulos()!).getAllByRole("button")
    // O nome fica embaixo do círculo (o último texto do botão).
    expect(botoes.map((b) => b.lastElementChild?.textContent)).toEqual(["Blusas", "Calças", "Acessórios"])

    const blusas = within(circulos()!).getByRole("button", { name: "Blusas" })
    const calcas = within(circulos()!).getByRole("button", { name: "Calças" })
    // A foto fica dentro de um círculo.
    expect(blusas.querySelector("img")?.parentElement?.className.split(" ")).toContain("rounded-full")
    expect(blusas.querySelector("img")?.getAttribute("src")).toBe(FOTO_BLUSAS)
    expect(calcas.querySelector("img")?.getAttribute("src")).toBe(FOTO_CALCA)
  })

  it("CA-B61-12: categoria sem nenhuma foto mostra a inicial do nome no círculo", () => {
    const { circulos } = abrirLoja()
    const acessorios = within(circulos()!).getByRole("button", { name: "Acessórios" })
    expect(acessorios.querySelector("img")).toBeNull()
    const circulo = acessorios.querySelector("span")!
    expect(circulo.className.split(" ")).toContain("rounded-full")
    expect(circulo.textContent).toBe("A")
  })

  it("CA-B61-13: categoria que a loja não entregou não aparece nem nos círculos nem nos chips", () => {
    // "Inverno" tem só produto oculto: o servidor não a entrega (conferido no teste de banco).
    const { circulos, chips } = abrirLoja()
    expect(within(circulos()!).queryByRole("button", { name: "Inverno" })).toBeNull()
    expect(within(chips()!).queryByRole("button", { name: "Inverno" })).toBeNull()
    // As outras estão nos dois lugares.
    expect(within(circulos()!).getAllByRole("button")).toHaveLength(3)
    expect(within(chips()!).getAllByRole("button").map((b) => b.textContent)).toEqual(["Tudo", "Blusas", "Calças", "Acessórios"])
    // Sem categoria nenhuma, nem a fileira de círculos nem os chips são desenhados.
    const vazia = abrirLoja({ categorias: [], produtos: [] })
    expect(vazia.container.querySelector("[data-circulo-categoria]")).toBeNull()
  })

  it("CA-B61-14: tocar no círculo 'Blusas' deixa só os produtos dela e marca o círculo e o chip", () => {
    const { circulos, chips, nomesDosProdutos } = abrirLoja()
    expect(nomesDosProdutos()).toEqual(["Blusa de linho", "Blusa de seda", "Calça jeans", "Cinto de couro"])
    const circulo = within(circulos()!).getByRole("button", { name: "Blusas" })
    const chip = within(chips()!).getByRole("button", { name: "Blusas" })
    expect(circulo.getAttribute("aria-pressed")).toBe("false")
    expect(chip.getAttribute("aria-pressed")).toBe("false")

    fireEvent.click(circulo)

    expect(nomesDosProdutos()).toEqual(["Blusa de linho", "Blusa de seda"])
    expect(circulo.getAttribute("aria-pressed")).toBe("true")
    expect(chip.getAttribute("aria-pressed")).toBe("true")
    expect(within(circulos()!).getByRole("button", { name: "Calças" }).getAttribute("aria-pressed")).toBe("false")
    expect(within(chips()!).getByRole("button", { name: "Tudo" }).getAttribute("aria-pressed")).toBe("false")

    // "Tudo" tira o filtro e desmarca o círculo.
    fireEvent.click(within(chips()!).getByRole("button", { name: "Tudo" }))
    expect(nomesDosProdutos()).toHaveLength(4)
    expect(circulo.getAttribute("aria-pressed")).toBe("false")
  })
})

describe("B61-02 — faixa do atacado", () => {
  it("CA-B61-18: com pedido mínimo de 10 peças, a faixa antes dos produtos mostra 'Atacado · Mínimo 10 peças'", () => {
    const { faixa, container } = abrirLoja({ avisoMinimo: minimoDaFaixa({ tipo: "pecas", valor: 10 }), avisoDesconto: resumoDoDesconto([]) })
    expect(texto(faixa())).toBe("Atacado · Mínimo 10 peças")
    const primeiroProduto = container.querySelector('a[href^="/loja/loja-teste/p/"]')!
    expect(antes(faixa()!, primeiroProduto)).toBe(true)
  })

  it("CA-B61-19: mínimo em reais e desconto por pedido entram na faixa, com o texto de hoje do desconto", () => {
    const { faixa } = abrirLoja({ avisoMinimo: minimoDaFaixa({ tipo: "valor", valor: 300 }), avisoDesconto: resumoDoDesconto([{ min: 50, percent: 10 }]) })
    const linhas = [...faixa()!.querySelectorAll("p")].map(texto)
    expect(linhas).toEqual(["Atacado · Mínimo R$ 300,00", "10% a menos a partir de 50 peças"])
  })

  it("CA-B61-20: loja sem pedido mínimo e sem desconto não mostra a faixa", () => {
    const { faixa, container } = abrirLoja({ avisoMinimo: minimoDaFaixa({ tipo: "nenhum", valor: null }), avisoDesconto: resumoDoDesconto([]) })
    expect(faixa()).toBeNull()
    expect(container.textContent).not.toContain("Atacado")
    // Com mínimo, a faixa existe: a ausência acima não é efeito de montagem errada.
    expect(abrirLoja({ avisoMinimo: minimoDaFaixa({ tipo: "pecas", valor: 10 }) }).faixa()).not.toBeNull()
  })
})

describe("B61-02 — foto no painel de categorias", () => {
  const FOTO_NOVA = "https://exemplo.test/marca/categoria-nova.jpg"
  const catalogo = (fotoUrl: string | null): Catalogo => ({ categorias: [{ id: "c1", nome: "Blusas", fotoUrl, subcategorias: [] }], produtos: [] })
  const arquivo = (nome: string, tipo: string, tamanho: number) => new File([new Uint8Array(tamanho)], nome, { type: tipo })

  function abrirPainel(fotoUrl: string | null = null) {
    const tela = render(<ProdutosClient inicial={catalogo(fotoUrl)} hrefLoja={null} />)
    const miniatura = () => tela.container.querySelector<HTMLElement>("[data-miniatura-categoria]")!
    const escolher = async (a: File) => {
      await act(async () => { fireEvent.change(screen.getByLabelText("Arquivo da foto de Blusas"), { target: { files: [a] } }) })
    }
    return { ...tela, miniatura, escolher }
  }

  it("CA-B61-54: o lojista envia um JPG de 1 MB e a miniatura da categoria passa a mostrar a imagem", async () => {
    preparar.mockResolvedValue({ caminho: "ws/marca/categoria-nova.jpg", token: "tk" })
    enviarAoArmazenamento.mockResolvedValue({ error: null })
    salvarFoto.mockResolvedValue({ catalogo: catalogo(FOTO_NOVA) })
    const { miniatura, escolher } = abrirPainel()
    expect(miniatura().querySelector("img")).toBeNull()
    expect(miniatura().textContent).toBe("B")
    expect(screen.getByLabelText("Enviar foto de Blusas")).toBeTruthy()

    const jpg = arquivo("blusas.jpg", "image/jpeg", 1024 * 1024)
    await escolher(jpg)

    await waitFor(() => expect(miniatura().querySelector("img")?.getAttribute("src")).toBe(FOTO_NOVA))
    expect(miniatura().className.split(" ")).toContain("rounded-full")
    // O servidor recebeu o tipo e o tamanho, o arquivo foi ao armazenamento e a foto foi gravada na categoria.
    expect(preparar).toHaveBeenCalledWith("c1", { tipo: "image/jpeg", tamanho: 1024 * 1024 })
    expect(enviarAoArmazenamento).toHaveBeenCalledWith("ws/marca/categoria-nova.jpg", "tk", jpg, { contentType: "image/jpeg" })
    expect(salvarFoto).toHaveBeenCalledWith("c1", "ws/marca/categoria-nova.jpg")
    // Com foto, o painel oferece trocar e remover.
    expect(screen.getByLabelText("Trocar foto de Blusas")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Remover foto de Blusas" })).toBeTruthy()
  })

  it("CA-B61-55: PDF ou imagem grande demais mostra o aviso da logo na tela e a foto da categoria não muda", async () => {
    const FOTO_ATUAL = "https://exemplo.test/marca/categoria-atual.jpg"
    const { miniatura, escolher } = abrirPainel(FOTO_ATUAL)

    preparar.mockResolvedValue({ erro: "Use PNG, JPG ou WebP." })
    await escolher(arquivo("tabela.pdf", "application/pdf", 1000))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Use PNG, JPG ou WebP."))
    expect(preparar).toHaveBeenLastCalledWith("c1", { tipo: "application/pdf", tamanho: 1000 })

    preparar.mockResolvedValue({ erro: "A imagem passa de 2 MB." })
    await escolher(arquivo("enorme.png", "image/png", 2 * 1024 * 1024 + 1))
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("A imagem passa de 2 MB."))

    // Nada foi enviado nem gravado, e a miniatura continua com a foto de antes.
    expect(enviarAoArmazenamento).not.toHaveBeenCalled()
    expect(salvarFoto).not.toHaveBeenCalled()
    expect(miniatura().querySelector("img")?.getAttribute("src")).toBe(FOTO_ATUAL)
  })
})
