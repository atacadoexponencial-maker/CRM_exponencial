// B53-13 — "Repetir pedido" mantém o nome e o WhatsApp: a loja guarda os dois no navegador
// junto do último pedido e os preenche ao repetir. As ações do servidor são falsas aqui
// (a conferência delas é de src/test/catalogo-repetir-pedido.integration.test.ts).

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useEffect } from "react"

vi.mock("next/font/google", () => {
  const fonte = () => ({ className: "", style: { fontFamily: "sans-serif" } })
  return { Inter: fonte, Poppins: fonte, Montserrat: fonte, Nunito: fonte, Space_Grotesk: fonte, Playfair_Display: fonte, Lora: fonte, DM_Serif_Display: fonte }
})
// O Turnstile não roda fora do navegador: a conferência sai pronta.
vi.mock("@/components/shared/conferencia-humana", () => ({
  ConferenciaHumana: ({ aoMudar, aoAguardar }: { aoMudar: (t: string | null) => void; aoAguardar: (a: boolean) => void }) => {
    useEffect(() => { aoMudar("ok"); aoAguardar(false) }, [aoMudar, aoAguardar])
    return null
  },
}))
vi.mock("@/app/loja/[endereco]/actions", () => ({ fazerPedido: vi.fn(), repetirPedido: vi.fn() }))

import { fazerPedido, repetirPedido } from "@/app/loja/[endereco]/actions"
import { useCarrinhoLoja } from "@/app/loja/[endereco]/usar-carrinho-loja"
import { TEMA_PADRAO } from "@/app/loja/components/tema"

const loja = `loja-b53-13-${Date.now()}`
const produtoId = "11111111-1111-1111-1111-111111111111"
const camiseta = { produtoId, combinacao: "M", nome: "Camiseta", preco: 29.9, fotoUrl: null, maximo: 10, faixas: [], minimo: null, grade: null }

function Loja({ comPeca = false }: { comPeca?: boolean }) {
  const { carrinho, abrir, gaveta } = useCarrinhoLoja(loja, TEMA_PADRAO, { tipo: "nenhum", valor: null })
  return (
    <>
      {comPeca && <button type="button" onClick={() => carrinho.adicionar(camiseta, 2)}>Pôr no carrinho</button>}
      <button type="button" onClick={abrir}>Abrir carrinho</button>
      {gaveta}
    </>
  )
}

afterEach(() => vi.restoreAllMocks())

describe("B53-13 — repetir pedido com nome e WhatsApp", () => {
  it("CA-B53-26: depois de um pedido com nome e WhatsApp, numa nova visita repetir refaz o carrinho e preenche os dois campos", async () => {
    vi.spyOn(window, "open").mockReturnValue(null)
    vi.mocked(fazerPedido).mockResolvedValue({ ok: true, numero: 1001, mensagem: "Pedido #1001", link: "https://wa.me/5511900000000" })
    vi.mocked(repetirPedido).mockResolvedValue({ ok: true, itens: [{ ...camiseta, quantidade: 2 }], fora: [] } as never)

    // 1ª visita: a cliente faz o pedido com nome e WhatsApp.
    const primeira = render(<Loja comPeca />)
    fireEvent.click(screen.getByRole("button", { name: "Pôr no carrinho" }))
    fireEvent.click(screen.getByRole("button", { name: "Abrir carrinho" }))
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana Souza" } })
    fireEvent.change(screen.getByLabelText("Seu WhatsApp com DDD"), { target: { value: "(21) 98888-7777" } })
    const enviar = await screen.findByRole("button", { name: "Fazer pedido pelo WhatsApp" })
    await waitFor(() => expect((enviar as HTMLButtonElement).disabled).toBe(false))
    await act(async () => { fireEvent.click(enviar) })
    await waitFor(() => expect(fazerPedido).toHaveBeenCalledTimes(1))
    // Guardado só no navegador, junto do último pedido.
    await waitFor(() => expect(JSON.parse(localStorage.getItem(`ultimo-pedido:${loja}`) ?? "{}").cliente).toEqual({ nome: "Ana Souza", whatsapp: "(21) 98888-7777" }))
    primeira.unmount()

    // 2ª visita: carrinho vazio, ela usa "Repetir último pedido".
    render(<Loja />)
    fireEvent.click(screen.getByRole("button", { name: "Abrir carrinho" }))
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Repetir último pedido (#1001)" })) })
    expect(repetirPedido).toHaveBeenCalledWith(loja, [{ produtoId, combinacao: "M", quantidade: 2 }])
    // O carrinho é refeito e os campos vêm preenchidos.
    expect(await screen.findByText("Camiseta")).toBeTruthy()
    expect((screen.getByLabelText("Seu nome") as HTMLInputElement).value).toBe("Ana Souza")
    expect((screen.getByLabelText("Seu WhatsApp com DDD") as HTMLInputElement).value).toBe("(21) 98888-7777")
  })
})
