// B61-01 — Topo da loja com logo redonda, Instagram e compartilhar.
// Testes de tela: a vitrine como a cliente vê e o campo do Instagram na Aparência.
// O que o servidor grava e recusa está em src/test/loja-instagram.integration.test.ts.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})

import { Vitrine } from "@/app/loja/components/vitrine"
import { EditorAparencia } from "@/app/(auth)/catalogo/components/editor-aparencia"
import { TEMA_PADRAO, type TemaLoja } from "@/app/loja/components/tema"
import { AVISO_INSTAGRAM } from "@/lib/catalogo/regras"

const LOGO = "https://exemplo.test/logo.png"
const BANNER = "https://exemplo.test/banner.jpg"
const BOAS_VINDAS = "Moda feminina no atacado desde 2015."

function tema(parcial: Partial<TemaLoja> = {}): TemaLoja {
  return { ...TEMA_PADRAO, nomeLoja: "Loja Teste", boasVindas: BOAS_VINDAS, instagram: "lojateste", logoUrl: LOGO, bannerUrl: BANNER, ...parcial }
}

function abrirLoja(t: TemaLoja, extras: Partial<Parameters<typeof Vitrine>[0]> = {}) {
  const tela = render(<Vitrine tema={t} categorias={[]} produtos={[]} hrefLoja="/loja/loja-teste" {...extras} />)
  const topo = tela.container.querySelector<HTMLElement>("[data-topo-loja]")!
  return { ...tela, topo }
}

/** `a` vem antes de `b` na página. */
function antes(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
}

beforeAll(() => {
  // O jsdom não tem ResizeObserver (a prévia da Aparência e o "ver mais" usam).
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("B61-01 — topo da vitrine", () => {
  it("CA-B61-01: o topo mostra a logo dentro de um círculo e, abaixo dela, o nome, o @ e as boas-vindas", () => {
    const { topo } = abrirLoja(tema())
    const circulo = topo.querySelector<HTMLElement>("[data-logo-redonda]")!
    expect(circulo.className.split(" ")).toContain("rounded-full")
    expect(circulo.querySelector("img")?.getAttribute("src")).toBe(LOGO)

    const nome = within(topo).getByRole("heading", { level: 1, name: "Loja Teste" })
    const arroba = within(topo).getByText("@lojateste")
    const texto = within(topo).getByText(BOAS_VINDAS)
    expect(antes(circulo, nome)).toBe(true)
    expect(antes(nome, arroba)).toBe(true)
    expect(antes(arroba, texto)).toBe(true)
  })

  it("CA-B61-02: loja sem logo mostra a inicial do nome no círculo e o nome abaixo dele", () => {
    const { topo } = abrirLoja(tema({ logoUrl: null, nomeLoja: "Bela Moda" }))
    const circulo = topo.querySelector<HTMLElement>("[data-logo-redonda]")!
    expect(circulo.querySelector("img")).toBeNull()
    expect(circulo.textContent).toBe("B")
    const nome = within(topo).getByRole("heading", { level: 1, name: "Bela Moda" })
    expect(antes(circulo, nome)).toBe(true)
  })

  it("CA-B61-03: loja sem Instagram não mostra o @ nem deixa espaço no lugar dele", () => {
    const { topo } = abrirLoja(tema({ instagram: "" }))
    expect(topo.textContent).not.toContain("@")
    expect(topo.querySelector('a[href*="instagram.com"]')).toBeNull()
    // Com Instagram, o link existe: a ausência acima não é efeito de montagem errada.
    const comInstagram = abrirLoja(tema())
    expect(comInstagram.topo.querySelector('a[href*="instagram.com"]')).not.toBeNull()
  })

  it("CA-B61-04: o @ abre o Instagram da loja em outra aba", () => {
    const { topo } = abrirLoja(tema())
    const link = within(topo).getByRole("link", { name: "@lojateste" })
    expect(link.getAttribute("href")).toBe("https://instagram.com/lojateste")
    expect(link.getAttribute("target")).toBe("_blank")
  })

  it("CA-B61-06: loja sem banner mostra logo, nome e compartilhar, sem imagem de capa", () => {
    const comBanner = abrirLoja(tema())
    expect(comBanner.topo.querySelector("[data-banner-loja]")?.getAttribute("src")).toBe(BANNER)
    comBanner.unmount()

    const { topo } = abrirLoja(tema({ bannerUrl: null }))
    expect(topo.querySelector("[data-banner-loja]")).toBeNull()
    expect(topo.querySelectorAll("img")).toHaveLength(1) // só a logo
    expect(topo.querySelector("[data-logo-redonda] img")?.getAttribute("src")).toBe(LOGO)
    expect(within(topo).getByRole("heading", { level: 1, name: "Loja Teste" })).toBeTruthy()
    expect(within(topo).getByRole("button", { name: "Compartilhar catálogo" })).toBeTruthy()
  })

  it("CA-B61-07: 'Compartilhar catálogo' abre o compartilhamento do aparelho com o nome e o link da vitrine", async () => {
    const compartilhar = vi.fn(async () => {})
    vi.stubGlobal("navigator", { ...navigator, share: compartilhar })
    const { topo } = abrirLoja(tema())
    await act(async () => { fireEvent.click(within(topo).getByRole("button", { name: "Compartilhar catálogo" })) })
    expect(compartilhar).toHaveBeenCalledTimes(1)
    expect(compartilhar).toHaveBeenCalledWith({ title: "Loja Teste", url: `${window.location.origin}/loja/loja-teste` })
    vi.unstubAllGlobals()
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  })

  it("CA-B61-08: sem compartilhamento no aparelho, o link é copiado e o botão mostra 'Link copiado' por 2 segundos", async () => {
    vi.useFakeTimers()
    const copiar = vi.fn(async () => {})
    vi.stubGlobal("navigator", { clipboard: { writeText: copiar } })
    const { topo } = abrirLoja(tema())
    await act(async () => { fireEvent.click(within(topo).getByRole("button", { name: "Compartilhar catálogo" })) })
    expect(copiar).toHaveBeenCalledWith(`${window.location.origin}/loja/loja-teste`)
    expect(within(topo).getByRole("button", { name: "Link copiado" })).toBeTruthy()
    act(() => { vi.advanceTimersByTime(1900) })
    expect(within(topo).getByRole("button", { name: "Link copiado" })).toBeTruthy()
    act(() => { vi.advanceTimersByTime(200) })
    expect(within(topo).getByRole("button", { name: "Compartilhar catálogo" })).toBeTruthy()
    vi.unstubAllGlobals()
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  })

  it("CA-B61-09: texto de boas-vindas longo abre inteiro com 'ver mais', que vira 'ver menos'", () => {
    // O jsdom não calcula altura: simula um parágrafo que não cabe nas duas linhas.
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(120)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40)
    const longo = `${"Moda feminina no atacado. ".repeat(12).slice(0, 298).trim()}.`
    expect(longo.length).toBeGreaterThan(280)
    expect(longo.length).toBeLessThanOrEqual(300)
    const { topo } = abrirLoja(tema({ boasVindas: longo }))
    const paragrafo = within(topo).getByText(longo)
    expect(paragrafo.className.split(" ")).toContain("line-clamp-2")

    fireEvent.click(within(topo).getByRole("button", { name: "ver mais" }))
    expect(within(topo).getByText(longo).className.split(" ")).not.toContain("line-clamp-2")
    const menos = within(topo).getByRole("button", { name: "ver menos" })
    expect(menos.getAttribute("aria-expanded")).toBe("true")
  })

  it("CA-B61-09: texto que cabe em duas linhas não mostra 'ver mais'", () => {
    const { topo } = abrirLoja(tema())
    expect(within(topo).queryByRole("button", { name: "ver mais" })).toBeNull()
  })

  it("CA-B61-10: a barra do alto mostra o carrinho com 3 e 'Repetir pedido', e os dois funcionam", () => {
    const abrirCarrinho = vi.fn()
    const repetir = vi.fn()
    abrirLoja(tema(), { quantidadeNoCarrinho: 3, onAbrirCarrinho: abrirCarrinho, onRepetirPedido: repetir })
    const barra = screen.getByRole("banner")
    const carrinho = within(barra).getByRole("button", { name: "Carrinho com 3 peças" })
    expect(carrinho.textContent).toBe("3")
    fireEvent.click(carrinho)
    expect(abrirCarrinho).toHaveBeenCalledTimes(1)
    fireEvent.click(within(barra).getByRole("button", { name: "Repetir último pedido" }))
    expect(repetir).toHaveBeenCalledTimes(1)
    // A barra traz a logo pequena redonda e o nome da loja.
    expect(barra.querySelector("[data-logo-redonda] img")?.getAttribute("src")).toBe(LOGO)
    expect(barra.textContent).toContain("Loja Teste")
  })
})

describe("B61-01 — Instagram na tela de Aparência", () => {
  function abrirAparencia(onSalvar: (t: TemaLoja) => Promise<{ erro?: string; aviso?: string }>) {
    return render(
      <EditorAparencia
        inicial={tema({ instagram: "", logoUrl: null, bannerUrl: null })}
        categorias={[]}
        produtos={[]}
        avisoMinimo={null}
        onEnviarImagem={async () => ({ erro: "sem envio no teste" })}
        onSalvar={onSalvar}
      />
    )
  }

  it("CA-B61-50: o lojista digita o Instagram, salva, a tela confirma e a prévia da loja mostra o @", async () => {
    const salvar = vi.fn(async (t: TemaLoja) => { void t; return { aviso: "Salvo. A loja já abre com a aparência nova." } })
    abrirAparencia(salvar)
    const previa = screen.getByTestId("previa-vitrine")
    expect(previa.textContent).not.toContain("@lojateste")

    fireEvent.change(screen.getByLabelText("Instagram da loja (opcional)"), { target: { value: "lojateste" } })
    expect(within(previa).getByRole("link", { name: "@lojateste" })).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar" })) })

    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar.mock.calls[0][0].instagram).toBe("lojateste")
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Salvo. A loja já abre com a aparência nova."))
  })

  it("CA-B61-52: Instagram inválido mostra o aviso do servidor na tela", async () => {
    const salvar = vi.fn(async (t: TemaLoja) => { void t; return { erro: AVISO_INSTAGRAM } })
    abrirAparencia(salvar)
    fireEvent.change(screen.getByLabelText("Instagram da loja (opcional)"), { target: { value: "loja teste!" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar" })) })
    expect(salvar.mock.calls[0][0].instagram).toBe("loja teste!")
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Use só letras, números, ponto e sublinhado, com até 30 caracteres."))
  })
})
