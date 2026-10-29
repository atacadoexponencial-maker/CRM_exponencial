// B51-01 — Tela de convites: o que a pessoa vê. As actions são mockadas; o que elas
// gravam é conferido em convites-plataforma.integration.test.ts.

import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/app/(auth)/plataforma/convites/actions", () => ({
  criarConvite: vi.fn(),
  gerarLinkNovo: vi.fn(),
  cancelarConvite: vi.fn(),
  listarConvites: vi.fn(),
}))

import { ConvitesClient } from "@/app/(auth)/plataforma/convites/convites-client"
import { criarConvite, listarConvites, type ConviteListado } from "@/app/(auth)/plataforma/convites/actions"
import { AVISO_VALIDADE } from "@/lib/convites"

const convite = (c: Partial<ConviteListado>): ConviteListado => ({
  id: "c1",
  email: null,
  criadoPor: "Marcelle",
  criadoEm: "2026-10-29T12:00:00Z",
  expiraEm: "2026-11-05T12:00:00Z",
  situacao: "pendente",
  empresa: null,
  ...c,
})

beforeEach(() => vi.clearAllMocks())

describe("B51-01 — Tela de convites", () => {
  it("CA-B51-14: should mostrar o link para copiar e o link avulso pendente na lista", async () => {
    vi.mocked(criarConvite).mockResolvedValue({ link: "https://crm.teste/cadastro?convite=abc" })
    vi.mocked(listarConvites).mockResolvedValue([convite({})])
    render(<ConvitesClient convitesIniciais={[]} />)

    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }))

    expect(await screen.findByRole("textbox", { name: "Link do convite" })).toHaveValue("https://crm.teste/cadastro?convite=abc")
    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument()
    expect(criarConvite).toHaveBeenCalledWith({ validade: { dias: 7 } })
    const linha = (await screen.findByText("Link avulso")).closest("tr")!
    expect(within(linha).getByText("Pendente")).toBeInTheDocument()
  })

  it("CA-B51-16: should avisar que a validade precisa estar entre agora e 90 dias", async () => {
    vi.mocked(criarConvite).mockResolvedValue({ erro: AVISO_VALIDADE })
    render(<ConvitesClient convitesIniciais={[]} />)

    fireEvent.click(screen.getByRole("radio", { name: "Escolher data" }))
    fireEvent.change(screen.getByLabelText("Dia"), { target: { value: "2020-01-01" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar convite" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(AVISO_VALIDADE)
    expect(criarConvite).toHaveBeenCalledWith({ validade: { dia: "2020-01-01", hora: "23:59" } })
    expect(screen.queryByRole("textbox", { name: "Link do convite" })).not.toBeInTheDocument()
    expect(listarConvites).not.toHaveBeenCalled()
  })

  it("CA-B51-21: should mostrar a situação de cada convite e a empresa do usado", () => {
    render(
      <ConvitesClient
        convitesIniciais={[
          convite({ id: "1", email: "ana@exemplo.com", situacao: "pendente" }),
          convite({ id: "2", email: "bia@exemplo.com", situacao: "usado", empresa: "Atacado da Bia" }),
          convite({ id: "3", email: "caio@exemplo.com", situacao: "vencido" }),
          convite({ id: "4", email: "davi@exemplo.com", situacao: "cancelado" }),
        ]}
      />
    )
    const linha = (email: string) => screen.getByText(email).closest("tr")!
    expect(within(linha("ana@exemplo.com")).getByText("Pendente")).toBeInTheDocument()
    expect(within(linha("ana@exemplo.com")).getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    expect(within(linha("bia@exemplo.com")).getByText("Usado")).toBeInTheDocument()
    expect(within(linha("bia@exemplo.com")).getByText("Empresa: Atacado da Bia")).toBeInTheDocument()
    expect(within(linha("caio@exemplo.com")).getByText("Vencido")).toBeInTheDocument()
    expect(within(linha("davi@exemplo.com")).getByText("Cancelado")).toBeInTheDocument()
    // Só o pendente tem ações
    expect(within(linha("bia@exemplo.com")).queryByRole("button")).not.toBeInTheDocument()
  })
})
