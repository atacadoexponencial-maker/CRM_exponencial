// B61-03 — Subcategorias na vitrine, no painel de categorias e no editor de produto.
// Testes de tela. O que o servidor grava, recusa e entrega está em
// src/test/loja-subcategorias.integration.test.ts.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/catalogo" }))
vi.mock("@/integrations/supabase/client", () => ({ createClient: () => ({ storage: { from: vi.fn() } }) }))
vi.mock("@/app/(auth)/catalogo/actions", () => ({
  alternarVisivel: vi.fn(), criarCategoria: vi.fn(), excluirCategoria: vi.fn(), renomearCategoria: vi.fn(), reordenarCategoria: vi.fn(), reordenarProduto: vi.fn(),
  prepararEnvioFotoCategoria: vi.fn(), salvarFotoCategoria: vi.fn(),
  criarSubcategoria: vi.fn(), renomearSubcategoria: vi.fn(), excluirSubcategoria: vi.fn(), reordenarSubcategoria: vi.fn(),
}))

import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { TEMA_PADRAO } from "@/app/loja/components/tema"
import { ProdutosClient } from "@/app/(auth)/catalogo/produtos-client"
import { EditorProduto, type ProdutoEditavel } from "@/app/(auth)/catalogo/components/editor-produto"
import type { CategoriaCatalogo, ProdutoResumo } from "@/app/(auth)/catalogo/components/lista-produtos"
import { criarSubcategoria, excluirSubcategoria, type Catalogo } from "@/app/(auth)/catalogo/actions"

const criarSub = vi.mocked(criarSubcategoria)
const excluirSub = vi.mocked(excluirSubcategoria)

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
beforeEach(() => {
  sessionStorage.clear()
})
afterEach(() => {
  vi.clearAllMocks()
})

describe("B61-03 — chips de subcategoria na vitrine", () => {
  const tema = { ...TEMA_PADRAO, nomeLoja: "Loja Teste" }
  const CATEGORIAS: CategoriaVitrine[] = [
    { id: "blusas", nome: "Blusas", fotoUrl: null, subcategorias: [{ id: "curta", nome: "Manga curta" }, { id: "longa", nome: "Manga longa" }] },
    { id: "calcas", nome: "Calças", fotoUrl: null, subcategorias: [] },
  ]
  function produto(id: string, nome: string, categoriaId: string, subcategoriaId: string | null): ProdutoVitrine {
    return { id, nome, descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null, fotoUrl: null, categoriaId, subcategoriaId, destaque: false, variacoes: null, esgotado: false }
  }
  const PRODUTOS = [
    produto("p1", "Blusa manga curta", "blusas", "curta"),
    produto("p2", "Blusa manga longa", "blusas", "longa"),
    produto("p3", "Blusa sem subcategoria", "blusas", null),
    produto("p4", "Calça jeans", "calcas", null),
  ]

  function abrirLoja() {
    const tela = render(<Vitrine tema={tema} categorias={CATEGORIAS} produtos={PRODUTOS} hrefLoja="/loja/loja-teste" hrefProduto={(id) => `/loja/loja-teste/p/${id}`} />)
    const chipsDeCategoria = () => screen.getByRole("navigation", { name: "Categorias" })
    const subcategorias = () => screen.queryByRole("navigation", { name: "Subcategorias" })
    const nomesDosProdutos = () => [...tela.container.querySelectorAll('a[href^="/loja/loja-teste/p/"]')].map((a) => a.querySelector("p")?.textContent)
    const escolherCategoria = (nome: string) => fireEvent.click(within(chipsDeCategoria()).getByRole("button", { name: nome }))
    return { ...tela, subcategorias, nomesDosProdutos, escolherCategoria }
  }

  it("CA-B61-15: ao escolher 'Blusas' aparecem os chips 'Todas', 'Manga curta' e 'Manga longa', e os produtos das duas continuam na lista", () => {
    const { subcategorias, nomesDosProdutos, escolherCategoria } = abrirLoja()
    // Sem categoria escolhida, não há chips de subcategoria.
    expect(subcategorias()).toBeNull()

    escolherCategoria("Blusas")

    const chips = within(subcategorias()!).getAllByRole("button")
    expect(chips.map((c) => c.textContent)).toEqual(["Todas", "Manga curta", "Manga longa"])
    expect(chips.map((c) => c.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"])
    expect(nomesDosProdutos()).toContain("Blusa manga curta")
    expect(nomesDosProdutos()).toContain("Blusa manga longa")
    expect(nomesDosProdutos()).not.toContain("Calça jeans")

    // Categoria sem subcategorias não mostra os chips.
    escolherCategoria("Calças")
    expect(subcategorias()).toBeNull()
  })

  it("CA-B61-16: tocar em 'Manga curta' deixa só os produtos dela", () => {
    const { subcategorias, nomesDosProdutos, escolherCategoria } = abrirLoja()
    escolherCategoria("Blusas")
    expect(nomesDosProdutos()).toHaveLength(3)

    fireEvent.click(within(subcategorias()!).getByRole("button", { name: "Manga curta" }))

    expect(nomesDosProdutos()).toEqual(["Blusa manga curta"])
    expect(within(subcategorias()!).getByRole("button", { name: "Manga curta" }).getAttribute("aria-pressed")).toBe("true")
    expect(within(subcategorias()!).getByRole("button", { name: "Todas" }).getAttribute("aria-pressed")).toBe("false")

    // Trocar de categoria e voltar deixa "Todas" marcado de novo.
    escolherCategoria("Calças")
    expect(nomesDosProdutos()).toEqual(["Calça jeans"])
    escolherCategoria("Blusas")
    expect(within(subcategorias()!).getByRole("button", { name: "Todas" }).getAttribute("aria-pressed")).toBe("true")
    expect(nomesDosProdutos()).toHaveLength(3)
  })

  it("CA-B61-17: com 'Todas' marcado, o produto direto na categoria aparece junto com o de 'Manga curta'", () => {
    const { subcategorias, nomesDosProdutos, escolherCategoria } = abrirLoja()
    escolherCategoria("Blusas")
    expect(within(subcategorias()!).getByRole("button", { name: "Todas" }).getAttribute("aria-pressed")).toBe("true")
    expect(nomesDosProdutos()).toEqual(["Blusa manga curta", "Blusa manga longa", "Blusa sem subcategoria"])

    // Em "Manga curta" o produto sem subcategoria sai; voltando para "Todas", ele volta.
    fireEvent.click(within(subcategorias()!).getByRole("button", { name: "Manga curta" }))
    expect(nomesDosProdutos()).not.toContain("Blusa sem subcategoria")
    fireEvent.click(within(subcategorias()!).getByRole("button", { name: "Todas" }))
    expect(nomesDosProdutos()).toContain("Blusa sem subcategoria")
    expect(nomesDosProdutos()).toContain("Blusa manga curta")
  })
})

describe("B61-03 — subcategorias no painel de categorias", () => {
  const resumo = (id: string, subcategoriaId: string | null): ProdutoResumo => ({ id, nome: `Produto ${id}`, categoriaId: "c1", subcategoriaId, preco: 10, estoqueTotal: 1, visivel: true, fotoUrl: null })
  const catalogo = (subcategorias: { id: string; nome: string }[], produtos: ProdutoResumo[] = []): Catalogo => ({
    categorias: [{ id: "c1", nome: "Blusas", fotoUrl: null, subcategorias }],
    produtos,
  })

  function abrirPainel(inicial: Catalogo) {
    const tela = render(<ProdutosClient inicial={inicial} hrefLoja={null} />)
    const abrirSubcategorias = () => fireEvent.click(screen.getByRole("button", { name: /^Subcategorias de Blusas/ }))
    const lista = () => screen.getByRole("list", { name: "Subcategorias de Blusas" })
    const campo = () => screen.getByLabelText<HTMLInputElement>("Nome da nova subcategoria de Blusas")
    const criar = async (nome: string) => {
      fireEvent.change(campo(), { target: { value: nome } })
      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Criar subcategoria em Blusas" })) })
    }
    return { ...tela, abrirSubcategorias, lista, campo, criar }
  }

  it("CA-B61-57: o lojista cria 'Manga curta' dentro de 'Blusas' e ela aparece na lista de subcategorias da categoria", async () => {
    criarSub.mockResolvedValue({ catalogo: catalogo([{ id: "s1", nome: "Manga curta" }]) })
    const { abrirSubcategorias, lista, campo, criar } = abrirPainel(catalogo([]))
    expect(screen.getByRole("button", { name: "Subcategorias de Blusas (0)" })).toBeTruthy()
    abrirSubcategorias()
    expect(within(lista()).queryAllByRole("listitem")).toHaveLength(0)

    await criar("Manga curta")

    await waitFor(() => expect(within(lista()).getByText("Manga curta")).toBeTruthy())
    expect(criarSub).toHaveBeenCalledWith("c1", "Manga curta")
    expect(screen.getByRole("button", { name: "Subcategorias de Blusas (1)" })).toBeTruthy()
    // Aceita pelo servidor, o campo fica pronto para a próxima.
    expect(campo().value).toBe("")
  })

  it("CA-B61-58: nome repetido ou vazio mostra o aviso do servidor na tela e nada é criado", async () => {
    const { abrirSubcategorias, lista, campo, criar } = abrirPainel(catalogo([{ id: "s1", nome: "Manga curta" }]))
    abrirSubcategorias()

    criarSub.mockResolvedValue({ erro: "Já existe uma subcategoria com esse nome." })
    await criar("manga curta")
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Já existe uma subcategoria com esse nome."))
    expect(criarSub).toHaveBeenLastCalledWith("c1", "manga curta")
    // Recusado: a lista não muda e o que foi digitado continua no campo.
    expect(within(lista()).getAllByRole("listitem")).toHaveLength(1)
    expect(campo().value).toBe("manga curta")

    criarSub.mockResolvedValue({ erro: "Dê um nome à subcategoria." })
    await criar("")
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Dê um nome à subcategoria."))
    expect(within(lista()).getAllByRole("listitem")).toHaveLength(1)
  })

  it("CA-B61-61: o aviso de apagar diz quantos produtos a subcategoria tem; confirmado, ela some da lista", async () => {
    const produtos = [resumo("p1", "s1"), resumo("p2", "s1"), resumo("p3", "s1"), resumo("p4", null)]
    excluirSub.mockResolvedValue({ catalogo: catalogo([], produtos.map((p) => ({ ...p, subcategoriaId: null }))) })
    const { abrirSubcategorias, lista } = abrirPainel(catalogo([{ id: "s1", nome: "Manga curta" }], produtos))
    abrirSubcategorias()

    fireEvent.click(within(lista()).getByRole("button", { name: "Excluir Manga curta" }))
    const aviso = await screen.findByRole("dialog")
    expect(aviso.textContent).toContain("Excluir a subcategoria Manga curta?")
    expect(aviso.textContent).toContain("Ela tem 3 produtos. Eles continuam em Blusas, sem subcategoria.")
    // Nada é apagado antes de confirmar.
    expect(excluirSub).not.toHaveBeenCalled()

    await act(async () => { fireEvent.click(within(aviso).getByRole("button", { name: "Excluir subcategoria" })) })

    expect(excluirSub).toHaveBeenCalledWith("s1")
    await waitFor(() => expect(within(lista()).queryByText("Manga curta")).toBeNull())
    // A categoria continua com os 4 produtos.
    expect(screen.getByRole("button", { name: "Subcategorias de Blusas (0)" })).toBeTruthy()
  })
})

describe("B61-03 — campo Subcategoria no editor de produto", () => {
  const CATEGORIAS: CategoriaCatalogo[] = [
    { id: "c1", nome: "Blusas", fotoUrl: null, subcategorias: [{ id: "s1", nome: "Manga curta" }, { id: "s2", nome: "Manga longa" }] },
    { id: "c2", nome: "Calças", fotoUrl: null, subcategorias: [{ id: "s3", nome: "Básicas" }] },
  ]
  function produto(parcial: Partial<ProdutoEditavel>): ProdutoEditavel {
    return { id: "p1", nome: "Blusa", descricao: "", preco: 10, precoDe: null, codigo: "", faixas: [], minimo: null, grade: null, categoriaId: null, subcategoriaId: null, visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 3 }, ...parcial }
  }
  function abrirEditor(inicial: ProdutoEditavel) {
    const salvar = vi.fn(async (p: ProdutoEditavel) => { void p; return {} })
    render(<EditorProduto inicial={inicial} categorias={CATEGORIAS} hrefVoltar="/catalogo" onAdicionarFotos={async () => ({ fotos: [], erros: [] })} onSalvar={salvar} novoId={() => "t1"} />)
    const campo = () => screen.getByLabelText<HTMLSelectElement>("Subcategoria")
    const opcoes = () => [...campo().options].map((o) => o.textContent)
    return { salvar, campo, opcoes }
  }

  it("CA-B61-63: produto em 'Blusas' escolhe entre 'Nenhuma', 'Manga curta' e 'Manga longa', e nenhuma subcategoria de outra categoria", () => {
    const { campo, opcoes } = abrirEditor(produto({ categoriaId: "c1" }))
    expect(opcoes()).toEqual(["Nenhuma", "Manga curta", "Manga longa"])
    expect(opcoes()).not.toContain("Básicas")
    expect(campo().disabled).toBe(false)
    // O campo fica abaixo de "Categoria".
    const categoria = screen.getByLabelText("Categoria")
    expect(Boolean(categoria.compareDocumentPosition(campo()) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  })

  it("CA-B61-64: trocar a categoria do produto limpa a subcategoria do que é salvo", async () => {
    const { salvar, campo, opcoes } = abrirEditor(produto({ categoriaId: "c1", subcategoriaId: "s1" }))
    expect(campo().value).toBe("s1")

    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "c2" } })

    expect(campo().value).toBe("")
    expect(opcoes()).toEqual(["Nenhuma", "Básicas"])
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar" })) })
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar.mock.calls[0][0]).toMatchObject({ categoriaId: "c2", subcategoriaId: null })
  })

  it("CA-B61-65: produto sem categoria vê o campo desligado, com 'Escolha uma categoria primeiro'", () => {
    const { campo, opcoes } = abrirEditor(produto({ categoriaId: null }))
    expect(campo().disabled).toBe(true)
    expect(opcoes()).toEqual(["Escolha uma categoria primeiro"])
    // Escolhida a categoria, o campo liga.
    fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "c1" } })
    expect(campo().disabled).toBe(false)
    expect(opcoes()).toEqual(["Nenhuma", "Manga curta", "Manga longa"])
  })
})
