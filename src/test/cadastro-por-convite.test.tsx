// B51-02 — Página do cadastro: o que a pessoa vê com e sem convite. A conferência do
// convite no banco é testada em cadastro-por-convite.integration.test.ts.

import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/cadastro/actions", () => ({ cadastrarEmpresa: vi.fn() }))
vi.mock("@/lib/convites", async (original) => ({
  ...(await original<typeof import("@/lib/convites")>()),
  conviteParaCadastro: vi.fn(),
}))

import CadastroPage from "@/app/cadastro/page"
import { cadastrarEmpresa } from "@/app/cadastro/actions"
import { AVISO_CONVITE_INVALIDO, conviteParaCadastro } from "@/lib/convites"

async function abrir(convite?: string) {
  const pagina = await CadastroPage({ searchParams: Promise.resolve(convite ? { convite } : {}) })
  await act(async () => {
    render(pagina)
  })
}

beforeEach(() => vi.clearAllMocks())

describe("B51-02 — Página do cadastro", () => {
  it("CA-B51-01: should dizer que o cadastro é por convite e não mostrar o formulário", async () => {
    await abrir()
    expect(screen.getByRole("heading", { name: "Cadastro por convite" })).toBeInTheDocument()
    expect(screen.getByText(/feito por convite/)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Criar conta" })).not.toBeInTheDocument()
    expect(conviteParaCadastro).not.toHaveBeenCalled()
  })

  it("CA-B51-02: should mostrar o aviso de convite que não vale, sem formulário", async () => {
    vi.mocked(conviteParaCadastro).mockResolvedValue(null)
    await abrir("convite-vencido")
    expect(conviteParaCadastro).toHaveBeenCalledWith("convite-vencido")
    expect(screen.getByText(AVISO_CONVITE_INVALIDO)).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Criar conta" })).not.toBeInTheDocument()
  })

  it("CA-B51-03: should vir com o e-mail do convite, sem poder trocar", async () => {
    vi.mocked(conviteParaCadastro).mockResolvedValue({ email: "ana@exemplo.com" })
    await abrir("convite-da-ana")
    const email = screen.getByLabelText("E-mail")
    expect(email).toHaveValue("ana@exemplo.com")
    expect(email).toHaveAttribute("readonly")
    expect(screen.getByLabelText("Nome da empresa")).not.toHaveAttribute("readonly")
  })

  it("CA-B51-09: should avisar que o e-mail está em uso", async () => {
    vi.mocked(conviteParaCadastro).mockResolvedValue({ email: null })
    vi.mocked(cadastrarEmpresa).mockResolvedValue({ erro: "email_em_uso" })
    await abrir("link-avulso")
    expect(screen.getByLabelText("E-mail")).toHaveValue("")
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("readonly")

    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Atacado da Ana" } })
    fireEvent.change(screen.getByLabelText("Nome do responsável"), { target: { value: "Ana" } })
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@exemplo.com" } })
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-segura-123" } })
    fireEvent.change(screen.getByLabelText("Confirmação de senha"), { target: { value: "senha-segura-123" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(await screen.findByText("E-mail já está em uso")).toBeInTheDocument()
    expect(cadastrarEmpresa).toHaveBeenCalledWith(expect.objectContaining({ convite: "link-avulso", email: "ana@exemplo.com" }))
  })
})
