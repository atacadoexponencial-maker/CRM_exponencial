// B31-01 — faixas de preço e mínimo por produto na vitrine: o carrinho e a página do
// produto mostram a regra e aplicam o preço da faixa. Só tela: o servidor confere de novo.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// As fontes da vitrine vêm do next/font, que não roda fora do Next.
vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})
import { Carrinho, type LinhaCarrinho } from "@/app/loja/components/carrinho"
import { PaginaProduto, type ProdutoDetalhe } from "@/app/loja/components/pagina-produto"
import { TEMA_PADRAO } from "@/app/loja/components/tema"

const faixas = [{ min: 12, preco: 24.9 }]

function linha(combinacao: string, quantidade: number, extra: Partial<LinhaCarrinho> = {}): LinhaCarrinho {
  return { produtoId: "cam", combinacao, nome: "Camiseta", fotoUrl: null, preco: 29.9, quantidade, maximo: 100, faixas, ...extra }
}

function renderCarrinho(linhas: LinhaCarrinho[], onFazerPedido = vi.fn()) {
  return render(
    <Carrinho
      tema={TEMA_PADRAO}
      aberto
      linhas={linhas}
      minimo={{ tipo: "nenhum", valor: null }}
      onFechar={() => {}}
      onMudarQuantidade={() => {}}
      onRemover={() => {}}
      onFazerPedido={onFazerPedido}
      onPedidoFeito={() => {}}
    />
  )
}

describe("B31-01 — preço por quantidade no carrinho", () => {
  it("CA-B31-05: com 8 peças (4 + 4) o unitário é o base e o carrinho avisa o que falta; com 12 vale a faixa nas duas linhas", () => {
    const { unmount } = renderCarrinho([linha("M / Azul", 4), linha("M / Preto", 4)])
    expect(screen.getByText("Faltam 4 peças para R$ 24,90")).toBeTruthy()
    expect(screen.queryByText(/cada \(preço por quantidade\)/)).toBeNull()
    expect(screen.getAllByText("R$ 119,60")).toHaveLength(2) // 4 × 29,90 em cada linha
    unmount()

    renderCarrinho([linha("M / Azul", 8), linha("M / Preto", 4)])
    expect(screen.queryByText(/Faltam/)).toBeNull()
    expect(screen.getAllByText("R$ 24,90 cada (preço por quantidade)")).toHaveLength(2)
    expect(screen.getByText("R$ 199,20")).toBeTruthy() // 8 × 24,90
    expect(screen.getByText("R$ 99,60")).toBeTruthy() // 4 × 24,90: a faixa vale nas duas linhas
    expect(screen.getByText("R$ 298,80")).toBeTruthy() // total
  })
})

describe("B31-01 — mínimo por produto na vitrine", () => {
  const produto: ProdutoDetalhe = {
    id: "cam",
    nome: "Camiseta",
    descricao: "",
    codigo: "",
    preco: 29.9,
    precoDe: null,
    faixas: [],
    minimo: 6,
    fotos: [],
    tipos: [],
    estoque: { "": 50 },
  }

  it("CA-B31-06: com 4 peças o botão avisa o mínimo e não adiciona; com 6 adiciona; no carrinho, 4 peças travam o pedido", async () => {
    const onAdicionar = vi.fn()
    const { unmount } = render(<PaginaProduto tema={TEMA_PADRAO} produto={produto} onAdicionar={onAdicionar} onVoltar={() => {}} />)
    expect(screen.getByText("mínimo 6 peças")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "4" } })
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 4 peças/ }))
    expect(screen.getByRole("alert").textContent).toContain("Mínimo 6 peças")
    expect(onAdicionar).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "6" } })
    fireEvent.click(screen.getByRole("button", { name: /Adicionar 6 peças/ }))
    expect(onAdicionar).toHaveBeenCalledWith([{ combinacao: "", quantidade: 6 }])
    unmount()

    const onFazerPedido = vi.fn()
    renderCarrinho([linha("", 4, { faixas: [], minimo: 6 })], onFazerPedido)
    expect(screen.getByText("Mínimo 6 peças deste produto")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana" } })
    fireEvent.change(screen.getByLabelText("Seu WhatsApp com DDD"), { target: { value: "21999990000" } })
    fireEvent.click(screen.getByRole("button", { name: "Fazer pedido pelo WhatsApp" }))
    expect(onFazerPedido).not.toHaveBeenCalled()
    expect(screen.getByRole("alert").textContent).toContain("abaixo do mínimo")
  })
})

describe("B31-02 — desconto por total do pedido no carrinho", () => {
  const descontos = [{ min: 50, percent: 10 }]

  it("CA-B31-17: com 50 peças a R$ 24,90 o carrinho mostra subtotal, desconto de 10% e total; com 49 avisa o que falta", () => {
    const { unmount } = render(
      <Carrinho tema={TEMA_PADRAO} aberto linhas={[linha("M / Azul", 30), linha("M / Preto", 20)]} minimo={{ tipo: "nenhum", valor: null }} descontos={descontos} onFechar={() => {}} onMudarQuantidade={() => {}} onRemover={() => {}} onFazerPedido={vi.fn()} onPedidoFeito={() => {}} />
    )
    expect(screen.getByText("Subtotal · 50 peças")).toBeTruthy()
    expect(screen.getByText("R$ 1.245,00")).toBeTruthy()
    expect(screen.getByText("Desconto de 10% do pedido")).toBeTruthy()
    expect(screen.getByText("− R$ 124,50")).toBeTruthy()
    expect(screen.getByText("R$ 1.120,50")).toBeTruthy()
    unmount()

    render(
      <Carrinho tema={TEMA_PADRAO} aberto linhas={[linha("M / Azul", 30), linha("M / Preto", 19)]} minimo={{ tipo: "nenhum", valor: null }} descontos={descontos} onFechar={() => {}} onMudarQuantidade={() => {}} onRemover={() => {}} onFazerPedido={vi.fn()} onPedidoFeito={() => {}} />
    )
    expect(screen.queryByText(/Desconto de 10%/)).toBeNull()
    expect(screen.getByText("Falta 1 peça para 10% de desconto")).toBeTruthy()
    expect(screen.getByText("R$ 1.220,10")).toBeTruthy() // 49 × 24,90, sem desconto
  })
})
