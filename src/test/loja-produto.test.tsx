// B61-06 — Página do produto com entrega e pagamento, rodapé e barra do WhatsApp.
// Testes de tela: a página do produto, a vitrine (rodapé e barra), as caixas das
// Configurações e a loja sem nada preenchido. As ações do servidor são falsas aqui; o que
// o servidor grava, recusa e entrega está em src/test/loja-entrega-pagamento.integration.test.ts.

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useEffect } from "react"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))
// O Turnstile não roda fora do navegador: a conferência sai pronta.
vi.mock("@/components/shared/conferencia-humana", () => ({
  ConferenciaHumana: ({ aoMudar, aoAguardar }: { aoMudar: (t: string | null) => void; aoAguardar: (a: boolean) => void }) => {
    useEffect(() => { aoMudar("ok"); aoAguardar(false) }, [aoMudar, aoAguardar])
    return null
  },
}))
vi.mock("@/app/loja/[endereco]/actions", () => ({ fazerPedido: vi.fn(), repetirPedido: vi.fn() }))

import { PaginaProduto, type ProdutoDetalhe } from "@/app/loja/components/pagina-produto"
import { Vitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { LojaClient } from "@/app/loja/[endereco]/loja-client"
import { ProdutoClient } from "@/app/loja/[endereco]/p/[produto]/produto-client"
import { FormConfiguracoes, type ConfigCatalogo } from "@/app/(auth)/catalogo/components/form-configuracoes"
import { TEMA_PADRAO, type TemaLoja } from "@/app/loja/components/tema"

const TEMA: TemaLoja = { ...TEMA_PADRAO, nomeLoja: "Loja Teste", layout: "grade" }
const SEM_MINIMO = { tipo: "nenhum" as const, valor: null }
const BARRA = "Pedido enviado e finalizado pelo WhatsApp da loja"
const AVISO_COMPRA = "Compra segura · pedido finalizado no WhatsApp da loja"
const TAMANHO = (opcoes: string[]) => ({ id: "t", nome: "Tamanho", opcoes })
const COR = (opcoes: string[]) => ({ id: "c", nome: "Cor", opcoes })

function produto(parcial: Partial<ProdutoDetalhe> = {}): ProdutoDetalhe {
  return { id: "11111111-1111-1111-1111-111111111111", nome: "Blusa canelada", descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null, fotos: [], tipos: [], estoque: { "": 50 }, ...parcial }
}
function daVitrine(id: string, nome: string, parcial: Partial<ProdutoVitrine> = {}): ProdutoVitrine {
  return {
    id, nome, descricao: "", codigo: "", preco: 10, precoDe: null, faixas: [], minimo: null, grade: null, fotoUrl: null,
    categoriaId: null, subcategoriaId: null, destaque: false, variacoes: null, opcoes: [], outrasOpcoes: null, esgotado: false, ultimasUnidades: false, ...parcial,
  }
}
function abrirProduto(p: ProdutoDetalhe, extras: Partial<Parameters<typeof PaginaProduto>[0]> = {}) {
  const adicionar = vi.fn()
  const tela = render(<PaginaProduto tema={TEMA} produto={p} onAdicionar={adicionar} onVoltar={() => {}} {...extras} />)
  return { ...tela, adicionar }
}
/** `a` vem antes de `b` na página. */
const antes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
/** O preço em reais sai com espaço que não quebra; aqui vira espaço comum. */
const texto = (e: Element | null) => (e?.textContent ?? "").replace(/ /g, " ")
/** Tamanho da letra em rem, como está escrito no elemento. */
const letra = (e: HTMLElement) => Number.parseFloat(e.style.fontSize)
const formasDe = (titulo: string) => within(screen.getByRole("list", { name: titulo })).getAllByRole("listitem").map((li) => li.textContent)
const itensGuardados = (endereco: string) => JSON.parse(localStorage.getItem(`carrinho:${endereco}`) ?? "[]") as Record<string, unknown>[]

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("B61-06 — página do produto", () => {
  it("CA-B61-40: a página mostra 'REF: 00001090' acima do nome e 'R$ 14,99' abaixo dele, em letra maior que a do nome", () => {
    const { container } = abrirProduto(produto({ codigo: "00001090", preco: 14.99 }))
    const ref = container.querySelector<HTMLElement>("[data-ref-produto]")!
    const nome = screen.getByRole("heading", { level: 1, name: "Blusa canelada" })
    const preco = container.querySelector<HTMLElement>("[data-preco-produto]")!

    expect(ref.textContent).toBe("REF: 00001090")
    expect(texto(preco)).toBe("R$ 14,99")
    expect(antes(ref, nome)).toBe(true)
    expect(antes(nome, preco)).toBe(true)
    expect(letra(nome)).toBeGreaterThan(0)
    expect(letra(preco)).toBeGreaterThan(letra(nome))
  })

  it("CA-B61-41: a linha do M sem estoque aparece riscada, com 'Esgotado', e não aceita quantidade; P e G aceitam", () => {
    const { adicionar } = abrirProduto(produto({ tipos: [TAMANHO(["P", "M", "G"])], estoque: { P: 5, M: 0, G: 8 } }))
    const linhas = within(screen.getByRole("region", { name: "Tamanho" })).getAllByRole("listitem")
    expect(linhas).toHaveLength(3)
    const [linhaP, linhaM, linhaG] = linhas

    // M: nome riscado, "Esgotado" e o campo travado.
    const rotuloM = within(linhaM).getByText("M")
    expect(rotuloM.className.split(" ")).toContain("line-through")
    expect(within(linhaM).getByText("Esgotado")).toBeTruthy()
    const campoM = within(linhaM).getByRole("textbox") as HTMLInputElement
    expect(campoM.disabled).toBe(true)
    for (const botao of within(linhaM).getAllByRole("button")) expect((botao as HTMLButtonElement).disabled).toBe(true)

    // P e G: sem risco, sem "Esgotado", e aceitam quantidade.
    for (const [linha, rotulo] of [[linhaP, "P"], [linhaG, "G"]] as const) {
      expect(within(linha).getByText(rotulo).className.split(" ")).not.toContain("line-through")
      expect(within(linha).queryByText("Esgotado")).toBeNull()
      expect((within(linha).getByRole("textbox") as HTMLInputElement).disabled).toBe(false)
    }
    fireEvent.change(screen.getByLabelText("Quantidade de P"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Quantidade de G"), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 5 peças/ }))
    expect(adicionar).toHaveBeenCalledWith([{ combinacao: "P", quantidade: 2 }, { combinacao: "G", quantidade: 3 }])
  })

  it("CA-B61-42: a página mostra 'Formas de entrega' e 'Formas de pagamento' com as opções da loja, e nenhuma outra", () => {
    abrirProduto(produto({ descricao: "Malha canelada." }), { formasEntrega: ["Correios", "Retirada no local"], formasPagamento: ["Pix", "Cartão de crédito"] })
    expect(screen.getByRole("heading", { name: "Mais informações" })).toBeTruthy()
    expect(screen.getByText("Malha canelada.")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Formas de entrega" })).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Formas de pagamento" })).toBeTruthy()
    expect(formasDe("Formas de entrega")).toEqual(["Correios", "Retirada no local"])
    expect(formasDe("Formas de pagamento")).toEqual(["Pix", "Cartão de crédito"])
  })

  it("CA-B61-43: sem forma de entrega marcada e com Pix em pagamento, 'Formas de entrega' não aparece e 'Formas de pagamento' mostra Pix", () => {
    const { container } = abrirProduto(produto(), { formasEntrega: [], formasPagamento: ["Pix"] })
    expect(screen.queryByRole("heading", { name: "Formas de entrega" })).toBeNull()
    expect(container.textContent).not.toContain("Formas de entrega")
    expect(formasDe("Formas de pagamento")).toEqual(["Pix"])
  })

  it("CA-B61-44: junto do botão de adicionar aparece 'Compra segura · pedido finalizado no WhatsApp da loja'", () => {
    const { container } = abrirProduto(produto())
    const botao = container.querySelector<HTMLElement>("[data-botao-adicionar]")!
    expect(botao.textContent).toMatch(/Adicionar 1 peça/)
    const aviso = screen.getByText(AVISO_COMPRA)
    // No mesmo bloco preso ao pé, logo depois do botão.
    expect(aviso.parentElement).toBe(botao.parentElement)
    expect(antes(botao, aviso)).toBe(true)
  })

  it("CA-B61-45: produto com Tamanho e Cor, com grade fechada e sem variação mandam ao carrinho as mesmas peças, preços, faixas e mínimos", () => {
    const base = { endereco: "", tema: TEMA, minimo: SEM_MINIMO, descontos: [], formasEntrega: ["Correios"], formasPagamento: ["Pix"] }

    // 1) Tamanho e Cor: escolhe por combinação.
    const duasVariacoes = produto({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", nome: "Vestido", preco: 20, tipos: [TAMANHO(["P", "M"]), COR(["Preto", "Branco"])], estoque: { "P / Preto": 9, "M / Preto": 9, "P / Branco": 9, "M / Branco": 9 } })
    let tela = render(<ProdutoClient {...base} endereco="loja-b61-06-a" produto={duasVariacoes} />)
    fireEvent.change(screen.getByLabelText("Quantidade de Preto, P"), { target: { value: "2" } })
    fireEvent.change(screen.getByLabelText("Quantidade de Branco, M"), { target: { value: "3" } })
    const botaoA = screen.getByRole("button", { name: /Adicionar 5 peças/ })
    expect(texto(botaoA)).toContain("R$ 100,00")
    fireEvent.click(botaoA)
    expect(itensGuardados("loja-b61-06-a")).toEqual([
      expect.objectContaining({ produtoId: duasVariacoes.id, combinacao: "P / Preto", quantidade: 2, nome: "Vestido", preco: 20, maximo: 9, faixas: [], minimo: null, grade: null }),
      expect.objectContaining({ produtoId: duasVariacoes.id, combinacao: "M / Branco", quantidade: 3, nome: "Vestido", preco: 20, maximo: 9, faixas: [], minimo: null, grade: null }),
    ])
    tela.unmount()

    // 2) Grade fechada: uma grade leva as peças de cada tamanho.
    const grade = { quantidades: { P: 1, M: 2 }, preco: null }
    const comGrade = produto({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Kit", preco: 10, grade, tipos: [TAMANHO(["P", "M"])], estoque: { P: 10, M: 10 } })
    tela = render(<ProdutoClient {...base} endereco="loja-b61-06-b" produto={comGrade} />)
    fireEvent.click(screen.getByRole("button", { name: "Mais uma grade de Tamanho" }))
    const botaoB = screen.getByRole("button", { name: /Adicionar 1 grade \(3 peças\)/ })
    expect(texto(botaoB)).toContain("R$ 30,00")
    fireEvent.click(botaoB)
    expect(itensGuardados("loja-b61-06-b")).toEqual([
      expect.objectContaining({ produtoId: comGrade.id, combinacao: "P", quantidade: 1, preco: 10, grade }),
      expect.objectContaining({ produtoId: comGrade.id, combinacao: "M", quantidade: 2, preco: 10, grade }),
    ])
    tela.unmount()

    // 3) Sem variação, com faixa de preço e mínimo: abaixo do mínimo não entra; no mínimo, entra pela faixa.
    const faixas = [{ min: 6, preco: 8 }]
    const semVariacao = produto({ id: "cccccccc-cccc-cccc-cccc-cccccccccccc", nome: "Cinto", preco: 10, faixas, minimo: 6, estoque: { "": 50 } })
    render(<ProdutoClient {...base} endereco="loja-b61-06-c" produto={semVariacao} />)
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 4 peças/ }))
    expect(screen.getByRole("alert").textContent).toContain("Mínimo 6 peças")
    expect(itensGuardados("loja-b61-06-c")).toEqual([])
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "6" } })
    const botaoC = screen.getByRole("button", { name: /Adicionar 6 peças/ })
    expect(texto(botaoC)).toContain("R$ 48,00")
    fireEvent.click(botaoC)
    expect(itensGuardados("loja-b61-06-c")).toEqual([
      expect.objectContaining({ produtoId: semVariacao.id, combinacao: "", quantidade: 6, preco: 10, maximo: 50, faixas, minimo: 6, grade: null }),
    ])
  })
})

describe("B61-06 — rodapé e barra do WhatsApp", () => {
  it("CA-B61-47: a vitrine tem uma barra presa ao pé da tela com 'Pedido enviado e finalizado pelo WhatsApp da loja'", () => {
    const { container } = render(<Vitrine tema={TEMA} categorias={[]} produtos={[daVitrine("p1", "Blusa")]} />)
    const barra = container.querySelector<HTMLElement>("[data-barra-whatsapp]")!
    expect(barra.textContent).toBe(BARRA)
    // Presa ao pé: acompanha a rolagem, colada na borda de baixo.
    expect(barra.className.split(" ")).toEqual(expect.arrayContaining(["sticky", "bottom-0"]))
    // É a última coisa da vitrine, depois da lista e do rodapé.
    expect(barra.nextElementSibling).toBeNull()
    expect(antes(container.querySelector("[data-rodape-loja]")!, barra)).toBe(true)
  })

  it("CA-B61-48: a barra não aparece na página do produto nem com o carrinho aberto; o botão de adicionar e o de fazer o pedido ficam livres", async () => {
    // Página do produto: sem a barra, com o botão de adicionar.
    const pagina = render(<ProdutoClient endereco="loja-b61-06-barra" tema={TEMA} minimo={SEM_MINIMO} descontos={[]} produto={produto()} formasEntrega={[]} formasPagamento={[]} />)
    expect(pagina.container.querySelector("[data-barra-whatsapp]")).toBeNull()
    expect(document.body.textContent).not.toContain(BARRA)
    expect((screen.getByRole("button", { name: /Adicionar 1 peça/ }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 1 peça/ }))
    pagina.unmount()

    // Vitrine: a barra está lá; com o carrinho aberto, some, e o botão do pedido aparece.
    const loja = render(
      <LojaClient endereco="loja-b61-06-barra" tema={TEMA} minimo={SEM_MINIMO} descontos={[]} categorias={[]} produtos={[daVitrine("p1", "Blusa")]} formasEntrega={[]} formasPagamento={[]} />
    )
    expect(loja.container.querySelector("[data-barra-whatsapp]")?.textContent).toBe(BARRA)
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Carrinho com 1 peças" })) })
    expect(await screen.findByText("Seu carrinho")).toBeTruthy()
    expect(document.querySelector("[data-barra-whatsapp]")).toBeNull()
    expect(document.body.textContent).not.toContain(BARRA)
    expect(await screen.findByRole("button", { name: "Fazer pedido pelo WhatsApp" })).toBeTruthy()

    // Fechou o carrinho: a barra volta.
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Fechar carrinho" })) })
    await waitFor(() => expect(loja.container.querySelector("[data-barra-whatsapp]")).not.toBeNull())
  })

  it("CA-B61-49: com 'Transportadora' em entrega e nada em pagamento, o rodapé mostra o texto do WhatsApp e 'Entrega: Transportadora', sem pagamento e sem 'todo o Brasil'", () => {
    const { container } = render(<Vitrine tema={TEMA} categorias={[]} produtos={[daVitrine("p1", "Blusa")]} formasEntrega={["Transportadora"]} formasPagamento={[]} />)
    const rodape = container.querySelector<HTMLElement>("[data-rodape-loja]")!
    const linhas = [...rodape.querySelectorAll("p")].map((p) => p.textContent)
    expect(linhas).toEqual([
      "Seu pedido será enviado para o WhatsApp da loja",
      "Entrega: Transportadora",
      "Catálogo digital · Compra assistida pelo WhatsApp da loja",
    ])
    expect(rodape.textContent).not.toContain("Pagamento")
    expect(rodape.textContent?.toLowerCase()).not.toContain("todo o brasil")
    expect(rodape.textContent).not.toContain("100% segura")
  })
})

describe("B61-06 — entrega e pagamento nas Configurações", () => {
  const CONFIG: ConfigCatalogo = { endereco: "", numeroPedidos: "", minimo: SEM_MINIMO, descontos: [], mensagemFechamento: "", publicado: false, limiteSelo: "", formasEntrega: [], formasPagamento: [] }

  it("CA-B61-70: o lojista marca 'Correios' e 'Excursão' em entrega e 'Pix' em pagamento, salva, e as três continuam marcadas", async () => {
    const salvar = vi.fn(async (c: ConfigCatalogo) => { void c; return { aviso: "Salvo. A loja está despublicada." } })
    render(<FormConfiguracoes inicial={CONFIG} prefixoLink="https://exemplo.test/loja/" onVerificarEndereco={async () => "disponivel"} onSalvar={salvar} />)
    const entrega = within(screen.getByRole("group", { name: "Formas de entrega" }))
    const pagamento = within(screen.getByRole("group", { name: "Formas de pagamento" }))
    // A lista pronta, com nada marcado.
    expect(entrega.getAllByRole("checkbox").map((c) => c.parentElement?.textContent)).toEqual(["Correios", "Transportadora", "Retirada no local", "Excursão"])
    expect(pagamento.getAllByRole("checkbox").map((c) => c.parentElement?.textContent)).toEqual(["Pix", "Cartão de crédito", "Boleto", "Dinheiro"])
    expect(screen.getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked)).toHaveLength(0)

    fireEvent.click(entrega.getByLabelText("Correios"))
    fireEvent.click(entrega.getByLabelText("Excursão"))
    fireEvent.click(pagamento.getByLabelText("Pix"))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar configurações" })) })

    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar.mock.calls[0][0].formasEntrega).toEqual(["correios", "excursao"])
    expect(salvar.mock.calls[0][0].formasPagamento).toEqual(["pix"])
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Salvo."))
    const marcadas = screen.getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked).map((c) => c.parentElement?.textContent)
    expect(marcadas).toEqual(["Correios", "Excursão", "Pix"])
  })
})

describe("B61-06 — loja sem nada preenchido", () => {
  it("CA-B61-72: vitrine e produto abrem no visual novo, sem @, sem selo, sem chips de subcategoria e sem os blocos de entrega e pagamento", () => {
    // Como a loja publicada antes da série chega do servidor: tema padrão e nada marcado.
    const temaAntigo: TemaLoja = { ...TEMA_PADRAO, nomeLoja: "Loja Antiga" }
    const produtos = [daVitrine("p1", "Camisa", { categoriaId: "c1", fotoUrl: "https://exemplo.test/p1.jpg" })]
    const vitrine = render(
      <Vitrine tema={temaAntigo} categorias={[{ id: "c1", nome: "Camisas", fotoUrl: null, subcategorias: [] }]} produtos={produtos} formasEntrega={[]} formasPagamento={[]} hrefLoja="/loja/loja-antiga" />
    )
    // Visual novo: topo com logo redonda, círculo de categoria, cartão em retrato, rodapé e barra.
    expect(vitrine.container.querySelector("[data-topo-loja] [data-logo-redonda]")).not.toBeNull()
    expect(vitrine.container.querySelectorAll("[data-circulo-categoria]")).toHaveLength(1)
    expect(vitrine.container.querySelectorAll("[data-cartao-retrato]")).toHaveLength(1)
    expect(vitrine.container.querySelector("[data-barra-whatsapp]")).not.toBeNull()
    // Sem @, sem selo, sem chips de subcategoria, sem entrega e pagamento.
    expect(vitrine.container.textContent).not.toContain("@")
    expect(vitrine.container.querySelector("[data-selo-cartao]")).toBeNull()
    fireEvent.click(within(screen.getByRole("navigation", { name: "Categorias" })).getByRole("button", { name: "Camisas" }))
    expect(screen.queryByRole("navigation", { name: "Subcategorias" })).toBeNull()
    const rodape = vitrine.container.querySelector("[data-rodape-loja]")!
    expect(rodape.textContent).not.toContain("Entrega:")
    expect(rodape.textContent).not.toContain("Pagamento:")
    vitrine.unmount()

    const { container, adicionar } = abrirProduto(produto({ nome: "Camisa", preco: 20 }), { tema: temaAntigo, formasEntrega: [], formasPagamento: [] })
    expect(texto(container.querySelector("[data-preco-produto]"))).toBe("R$ 20,00")
    expect(container.querySelector("[data-ref-produto]")).toBeNull()
    expect(container.querySelector("[data-mais-informacoes]")).toBeNull()
    expect(container.textContent).not.toContain("Formas de entrega")
    expect(container.textContent).not.toContain("Formas de pagamento")
    // E a compra segue: ela adiciona a peça.
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 1 peça/ }))
    expect(adicionar).toHaveBeenCalledWith([{ combinacao: "", quantidade: 1 }])
  })
})
