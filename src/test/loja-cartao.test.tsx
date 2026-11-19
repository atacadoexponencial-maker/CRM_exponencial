// B61-04 — Cartão em retrato com REF, tamanhos e selo "Últimas unidades!".
// Testes de tela: o cartão como a cliente vê, a prévia da Aparência e o campo do selo
// nas Configurações. O que a loja pública calcula e o que o servidor grava e recusa
// está em src/test/loja-cartao.integration.test.ts.

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { EditorAparencia } from "@/app/(auth)/catalogo/components/editor-aparencia"
import { FormConfiguracoes, type ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"
import { TEMA_PADRAO, type TemaLoja } from "@/app/loja/components/tema"

const AVISO_LIMITE = "Use um número inteiro de 1 a 999, ou deixe vazio para não mostrar o selo."
const TEMA: TemaLoja = { ...TEMA_PADRAO, nomeLoja: "Loja Teste", layout: "grade", logoUrl: "https://exemplo.test/logo.png" }
const CATEGORIAS: CategoriaVitrine[] = [{ id: "c1", nome: "Blusas", fotoUrl: null, subcategorias: [] }]

function produto(id: string, nome: string, parcial: Partial<ProdutoVitrine> = {}): ProdutoVitrine {
  return {
    id, nome, descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null,
    fotoUrl: `https://exemplo.test/${id}.jpg`, categoriaId: "c1", subcategoriaId: null, destaque: false,
    variacoes: null, opcoes: [], outrasOpcoes: null, esgotado: false, ultimasUnidades: false, ...parcial,
  }
}

/** Abre a loja no modelo "grade" e devolve como achar o cartão de um produto pelo nome. */
function abrirLoja(produtos: ProdutoVitrine[], extras: Partial<Parameters<typeof Vitrine>[0]> = {}) {
  const tela = render(<Vitrine tema={TEMA} categorias={CATEGORIAS} produtos={produtos} hrefLoja="/loja/loja-teste" {...extras} />)
  const cartao = (nome: string) => {
    const achado = [...tela.container.querySelectorAll<HTMLElement>("[data-cartao-retrato]")].find((c) => c.textContent?.includes(nome))
    expect(achado, `o cartão de ${nome} existe`).toBeDefined()
    return achado!
  }
  return { ...tela, cartao }
}

const quadradinhos = (cartao: HTMLElement) => [...cartao.querySelectorAll<HTMLElement>("[data-opcao-cartao]")]
/** O que está escrito no quadradinho, sem o texto só para leitor de tela. */
const rotulo = (q: HTMLElement) => q.firstChild?.textContent ?? ""
const riscado = (q: HTMLElement) => q.style.textDecoration === "line-through"
/** `a` vem antes de `b` na página. */
const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
/** O preço em reais sai com espaço que não quebra; aqui vira espaço comum. */
const texto = (e: Element) => (e.textContent ?? "").replace(/ /g, " ")

beforeAll(() => {
  // O jsdom não tem ResizeObserver (a prévia da Aparência usa).
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("B61-04 — cartão em retrato", () => {
  it("CA-B61-22: o cartão mostra 'REF: 00001090' acima do nome do produto", () => {
    const { cartao } = abrirLoja([produto("p1", "Blusa canelada", { codigo: "00001090" })])
    const c = cartao("Blusa canelada")
    const ref = [...c.querySelectorAll("p")].find((p) => p.textContent === "REF: 00001090")
    const nome = [...c.querySelectorAll("p")].find((p) => p.textContent === "Blusa canelada")
    expect(ref, "a linha REF existe").toBeDefined()
    expect(nome, "o nome existe").toBeDefined()
    expect(antes(ref!, nome!)).toBe(true)
  })

  it("CA-B61-23: produto sem código não mostra a linha 'REF'", () => {
    const { cartao } = abrirLoja([produto("p1", "Blusa lisa", { codigo: "" }), produto("p2", "Blusa de alça", { codigo: "   " })])
    expect(cartao("Blusa lisa").textContent).not.toContain("REF")
    expect(cartao("Blusa de alça").textContent).not.toContain("REF")
  })

  it("CA-B61-24: o cartão mostra P, M e G em quadradinhos, com o M (sem estoque) riscado", () => {
    const opcoes = [{ nome: "P", esgotada: false }, { nome: "M", esgotada: true }, { nome: "G", esgotada: false }]
    const { cartao } = abrirLoja([produto("p1", "Blusa canelada", { opcoes })])
    const q = quadradinhos(cartao("Blusa canelada"))
    expect(q.map(rotulo)).toEqual(["P", "M", "G"])
    expect(q.map(riscado)).toEqual([false, true, false])
  })

  it("CA-B61-25: produto com Tamanho e Cor mostra P e M em quadradinhos e o texto '2 opções de cor'", () => {
    const opcoes = [{ nome: "P", esgotada: false }, { nome: "M", esgotada: false }]
    const { cartao } = abrirLoja([produto("p1", "Vestido", { opcoes, outrasOpcoes: "2 opções de cor" })])
    const c = cartao("Vestido")
    expect(quadradinhos(c).map(rotulo)).toEqual(["P", "M"])
    expect(c.textContent).toContain("2 opções de cor")
    // As cores não viram quadradinho.
    expect(c.textContent).not.toContain("Preto")
  })

  it("CA-B61-27: produto sem variação não mostra quadradinhos de opção", () => {
    const { cartao } = abrirLoja([produto("p1", "Cinto", { opcoes: [] })])
    expect(quadradinhos(cartao("Cinto"))).toHaveLength(0)
  })

  it("CA-B61-28: o produto no limite do selo mostra 'Últimas unidades!' e o que está acima do limite não mostra", () => {
    const { cartao } = abrirLoja([produto("p1", "Com 5 peças", { ultimasUnidades: true }), produto("p2", "Com 6 peças", { ultimasUnidades: false })])
    expect(cartao("Com 5 peças").querySelector("[data-selo-cartao]")?.textContent).toBe("Últimas unidades!")
    expect(cartao("Com 6 peças").textContent).not.toContain("Últimas unidades!")
  })

  it("CA-B61-29: produto esgotado mostra só 'Esgotado', sem 'Últimas unidades!'", () => {
    const { cartao } = abrirLoja([produto("p1", "Sem estoque", { esgotado: true, ultimasUnidades: false })])
    const c = cartao("Sem estoque")
    expect(c.textContent).toContain("Esgotado")
    expect(c.textContent).not.toContain("Últimas unidades!")
    expect(c.querySelector("[data-selo-cartao]")).toBeNull()
  })

  it("CA-B61-31: os cartões continuam mostrando a grade fechada, a faixa de preço e o mínimo do produto", () => {
    const { cartao } = abrirLoja([
      produto("p1", "Kit grade", { grade: { quantidades: { P: 4, M: 4, G: 4 }, preco: null } }),
      produto("p2", "Com faixa", { faixas: [{ min: 6, preco: 9.9 }], minimo: 6 }),
    ])
    expect(texto(cartao("Kit grade"))).toContain("Grade fechada de 12 peças")
    expect(texto(cartao("Com faixa"))).toContain("A partir de 6: R$ 9,90 · mínimo 6 peças")
  })

  it("CA-B61-32: o preço de R$ 14,99 aparece com vírgula", () => {
    const { cartao } = abrirLoja([produto("p1", "Blusa", { preco: 14.99 })])
    expect(texto(cartao("Blusa"))).toContain("R$ 14,99")
    expect(texto(cartao("Blusa"))).not.toContain("14.99")
  })

  it("CA-B61-33: tocar na foto, no nome ou em um quadradinho abre a página do produto e não mexe no carrinho", () => {
    const abrirProduto = vi.fn()
    const abrirCarrinho = vi.fn()
    // O jsdom não navega: basta saber para onde o link aponta e que o toque chegou.
    vi.spyOn(console, "error").mockImplementation(() => {})
    const { cartao } = abrirLoja([produto("p1", "Blusa canelada", { opcoes: [{ nome: "P", esgotada: false }] }), produto("p2", "Outra blusa")], {
      hrefProduto: (id) => `/loja/loja-teste/p/${id}`,
      onAbrirProduto: abrirProduto,
      onAbrirCarrinho: abrirCarrinho,
      quantidadeNoCarrinho: 0,
    })
    const c = cartao("Blusa canelada")
    const foto = c.querySelector("img")!
    const nome = [...c.querySelectorAll("p")].find((p) => p.textContent === "Blusa canelada")!
    const quadradinho = quadradinhos(c)[0]

    for (const alvo of [foto, nome, quadradinho]) {
      expect(alvo.closest("a")?.getAttribute("href")).toBe("/loja/loja-teste/p/p1")
      fireEvent.click(alvo)
    }
    expect(abrirProduto).toHaveBeenCalledTimes(3)
    expect(abrirProduto.mock.calls.map((chamada) => chamada[0])).toEqual(["p1", "p1", "p1"])
    expect(abrirCarrinho).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Carrinho com 0 peças" })).toBeTruthy()
  })
})

describe("B61-04 — prévia da Aparência", () => {
  it("CA-B61-39: a prévia do modelo 'grade' mostra a logo redonda, os círculos de categoria e os cartões em retrato", () => {
    render(
      <EditorAparencia
        inicial={TEMA}
        categorias={CATEGORIAS}
        produtos={[produto("p1", "Blusa canelada", { codigo: "00001090", opcoes: [{ nome: "P", esgotada: false }], ultimasUnidades: true })]}
        avisoMinimo={null}
        onEnviarImagem={async () => ({ erro: "sem envio no teste" })}
        onSalvar={async () => ({})}
      />
    )
    const previa = screen.getByTestId("previa-vitrine")
    expect(previa.querySelector("[data-topo-loja] [data-logo-redonda] img")?.getAttribute("src")).toBe("https://exemplo.test/logo.png")
    expect(previa.querySelectorAll("[data-circulo-categoria]")).toHaveLength(1)

    const cartoes = previa.querySelectorAll<HTMLElement>("[data-cartao-retrato]")
    expect(cartoes).toHaveLength(1)
    // O mesmo cartão da loja pública: foto 4 por 5, REF, quadradinho e selo.
    expect(cartoes[0].querySelector("img")?.parentElement?.className.split(" ")).toContain("aspect-[4/5]")
    expect(cartoes[0].textContent).toContain("REF: 00001090")
    expect(quadradinhos(cartoes[0]).map(rotulo)).toEqual(["P"])
    expect(cartoes[0].querySelector("[data-selo-cartao]")?.textContent).toBe("Últimas unidades!")
  })
})

describe("B61-04 — limite do selo nas Configurações", () => {
  const CONFIG: ConfigCatalogo = { endereco: "", numeroPedidos: "", minimo: { tipo: "nenhum", valor: null }, descontos: [], mensagemFechamento: "", publicado: false, limiteSelo: "" }

  function abrirConfiguracoes(onSalvar: (c: ConfigCatalogo) => Promise<{ erro?: string; aviso?: string }>) {
    render(<FormConfiguracoes inicial={CONFIG} prefixoLink="https://exemplo.test/loja/" onVerificarEndereco={async () => "disponivel"} onSalvar={onSalvar} />)
    return screen.getByLabelText("Mostrar com quantas peças ou menos") as HTMLInputElement
  }

  it("CA-B61-67: o lojista digita 5 no campo do selo, salva e a tela confirma", async () => {
    const salvar = vi.fn(async (c: ConfigCatalogo) => { void c; return { aviso: "Salvo. A loja está despublicada." } })
    const campo = abrirConfiguracoes(salvar)
    expect(screen.getByRole("heading", { name: /Selo Últimas unidades/ }).textContent).toContain("opcional")

    fireEvent.change(campo, { target: { value: "5" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" })) })

    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar.mock.calls[0][0].limiteSelo).toBe("5")
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Salvo."))
    expect(campo.value).toBe("5")
  })

  it("CA-B61-68: com limite inválido, a tela mostra o aviso que o servidor devolve", async () => {
    // Quem recusa é o servidor: a tela manda o que foi digitado e mostra a resposta.
    const salvar = vi.fn(async (c: ConfigCatalogo) => { void c; return { erro: AVISO_LIMITE } })
    const campo = abrirConfiguracoes(salvar)

    fireEvent.change(campo, { target: { value: "2,5" } })
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" })) })

    expect(salvar.mock.calls[0][0].limiteSelo).toBe("2,5")
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(AVISO_LIMITE))
    // Nada foi dado como salvo: a tela continua avisando que há alteração pendente.
    expect(screen.getByText("Alterações não salvas")).toBeTruthy()
  })
})
