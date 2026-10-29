// B52-02 — Tela de criar senha nova: o que a pessoa vê. A conferência do link e a troca
// da senha são testadas em redefinir-senha.integration.test.ts.

import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock("@/app/redefinir-senha/actions", () => ({ salvarSenhaNova: vi.fn() }))
vi.mock("@/lib/senha-nova", async (original) => ({
  ...(await original<typeof import("@/lib/senha-nova")>()),
  linkDeSenhaNovaValido: vi.fn(),
}))

import RedefinirSenhaPage from "@/app/redefinir-senha/page"
import { salvarSenhaNova } from "@/app/redefinir-senha/actions"
import { AVISO_LINK_INVALIDO, linkDeSenhaNovaValido } from "@/lib/senha-nova"

async function abrir(codigo?: string) {
  const pagina = await RedefinirSenhaPage({ searchParams: Promise.resolve(codigo ? { codigo } : {}) })
  await act(async () => {
    render(pagina)
  })
}

function salvarCom(senha: string, confirmacao: string) {
  fireEvent.change(screen.getByLabelText("Senha nova"), { target: { value: senha } })
  fireEvent.change(screen.getByLabelText("Confirmação da senha"), { target: { value: confirmacao } })
  fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }))
}

beforeEach(() => vi.clearAllMocks())

describe("B52-02 — Tela de criar senha nova", () => {
  it("CA-B52-08: should mostrar o formulário de senha nova com o link que vale", async () => {
    vi.mocked(linkDeSenhaNovaValido).mockResolvedValue(true)
    await abrir("codigo-bom")
    expect(linkDeSenhaNovaValido).toHaveBeenCalledWith("codigo-bom")
    expect(screen.getByRole("heading", { name: "Criar senha nova" })).toBeInTheDocument()
    expect(screen.getByLabelText("Senha nova")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirmação da senha")).toBeInTheDocument()
  })

  it("CA-B52-09: should ir para o Dashboard depois de salvar", async () => {
    vi.mocked(linkDeSenhaNovaValido).mockResolvedValue(true)
    vi.mocked(salvarSenhaNova).mockResolvedValue({ ok: true })
    await abrir("codigo-bom")
    salvarCom("senha-nova-123", "senha-nova-123")

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"))
    expect(salvarSenhaNova).toHaveBeenCalledWith({ codigo: "codigo-bom", senha: "senha-nova-123", confirmarSenha: "senha-nova-123" })
  })

  it("CA-B52-11: should mostrar o aviso e o link para pedir outro, sem formulário", async () => {
    vi.mocked(linkDeSenhaNovaValido).mockResolvedValue(false)
    await abrir("codigo-vencido")
    expect(screen.getByText(AVISO_LINK_INVALIDO)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir outro link" })).toHaveAttribute("href", "/esqueci-minha-senha")
    expect(screen.queryByLabelText("Senha nova")).not.toBeInTheDocument()

    vi.clearAllMocks()
    await act(async () => {
      render(await RedefinirSenhaPage({ searchParams: Promise.resolve({}) }))
    })
    expect(linkDeSenhaNovaValido).not.toHaveBeenCalled()
    expect(screen.getAllByText(AVISO_LINK_INVALIDO).length).toBeGreaterThan(0)
  })

  it("CA-B52-12: should mostrar o erro da senha curta e da confirmação diferente, sem sair da tela", async () => {
    vi.mocked(linkDeSenhaNovaValido).mockResolvedValue(true)
    vi.mocked(salvarSenhaNova).mockResolvedValueOnce({ erro: "senha_curta" }).mockResolvedValueOnce({ erro: "senhas_diferentes" })
    await abrir("codigo-bom")

    salvarCom("curta", "curta")
    expect(await screen.findByRole("alert")).toHaveTextContent("A senha precisa ter pelo menos 8 caracteres.")
    salvarCom("senha-nova-123", "outra-senha-123")
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem."))
    expect(push).not.toHaveBeenCalled()
  })
})
