// B52-01 — Telas do "Esqueci minha senha": o link no login e o pedido. A action é
// mockada; o que ela grava e manda é conferido em esqueci-minha-senha.integration.test.ts.

import { Suspense } from "react"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({ unstable_rethrow: () => {}, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/login/actions", () => ({ realizarLogin: vi.fn() }))
vi.mock("@/app/esqueci-minha-senha/actions", () => ({ pedirLinkDeSenhaNova: vi.fn() }))

import LoginPage from "@/app/login/page"
import EsqueciMinhaSenhaPage, { AVISO_PEDIDO_RECEBIDO } from "@/app/esqueci-minha-senha/page"
import { pedirLinkDeSenhaNova } from "@/app/esqueci-minha-senha/actions"
import { AVISO_MUITAS_TENTATIVAS } from "@/app/login/avisos"

beforeEach(() => vi.clearAllMocks())

async function pedirCom(email: string) {
  render(<EsqueciMinhaSenhaPage />)
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } })
  const botao = await screen.findByRole("button", { name: "Enviar link" })
  fireEvent.click(botao)
}

describe("B52-01 — Esqueci minha senha na tela", () => {
  it("CA-B52-01: should ter no login o link \"Esqueci minha senha\" para a tela de pedir o link", async () => {
    await act(async () => {
      render(<Suspense><LoginPage searchParams={Promise.resolve({})} /></Suspense>)
    })
    expect(await screen.findByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/esqueci-minha-senha")
  })

  it("CA-B52-02: should trocar o formulário pela mensagem de pedido recebido", async () => {
    vi.mocked(pedirLinkDeSenhaNova).mockResolvedValue({ ok: true })
    await pedirCom("ana@exemplo.com")

    expect(await screen.findByText(AVISO_PEDIDO_RECEBIDO)).toBeInTheDocument()
    expect(AVISO_PEDIDO_RECEBIDO).toContain("1 hora")
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument()
    expect(pedirLinkDeSenhaNova).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@exemplo.com" }))
  })

  it("CA-B52-06: should avisar que houve tentativas demais", async () => {
    vi.mocked(pedirLinkDeSenhaNova).mockResolvedValue({ erro: "limite" })
    await pedirCom("ana@exemplo.com")

    expect(await screen.findByRole("alert")).toHaveTextContent(AVISO_MUITAS_TENTATIVAS)
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument()
  })
})
