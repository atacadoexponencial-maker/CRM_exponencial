// B51-03 — Tela de convites com e-mail: o que a pessoa vê. As actions são mockadas; o
// envio e o que fica gravado são conferidos em convite-por-email.integration.test.ts.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/app/(auth)/plataforma/convites/actions", () => ({
  criarConvite: vi.fn(),
  gerarLinkNovo: vi.fn(),
  cancelarConvite: vi.fn(),
  listarConvites: vi.fn(async () => []),
}))
const avisos: string[] = []
vi.mock("@/lib/aviso-na-tela", () => ({ avisar: (texto: string) => avisos.push(texto) }))

import { ConvitesClient } from "@/app/(auth)/plataforma/convites/convites-client"
import { criarConvite } from "@/app/(auth)/plataforma/convites/actions"

beforeEach(() => {
  vi.clearAllMocks()
  avisos.length = 0
})

function criarPara(email: string) {
  render(<ConvitesClient convitesIniciais={[]} />)
  fireEvent.change(screen.getByLabelText("E-mail (opcional)"), { target: { value: email } })
  fireEvent.click(screen.getByRole("button", { name: "Criar convite" }))
}

describe("B51-03 — Convite por e-mail na tela", () => {
  it("CA-B51-13: should mandar o e-mail digitado, avisar que saiu e mostrar o link", async () => {
    vi.mocked(criarConvite).mockResolvedValue({ link: "https://crm.teste/cadastro?convite=abc", emailEnviado: true })
    criarPara(" ana@exemplo.com ")

    expect(await screen.findByRole("textbox", { name: "Link do convite" })).toHaveValue("https://crm.teste/cadastro?convite=abc")
    expect(criarConvite).toHaveBeenCalledWith({ email: "ana@exemplo.com", validade: { dias: 7 } })
    expect(avisos).toContain("Convite enviado para ana@exemplo.com")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("CA-B51-17: should avisar que o e-mail já tem conta, sem link", async () => {
    vi.mocked(criarConvite).mockResolvedValue({ erro: "Este e-mail já tem conta no CRM." })
    criarPara("bia@exemplo.com")

    expect(await screen.findByRole("alert")).toHaveTextContent("Este e-mail já tem conta no CRM.")
    expect(screen.queryByRole("textbox", { name: "Link do convite" })).not.toBeInTheDocument()
  })

  it("CA-B51-18: should avisar que o e-mail não saiu e mostrar o link para mandar por outro meio", async () => {
    vi.mocked(criarConvite).mockResolvedValue({ link: "https://crm.teste/cadastro?convite=xyz", emailEnviado: false })
    criarPara("caio@exemplo.com")

    expect(await screen.findByRole("alert")).toHaveTextContent("O convite foi criado, mas o e-mail não saiu. Copie o link abaixo e mande por outro meio.")
    expect(screen.getByRole("textbox", { name: "Link do convite" })).toHaveValue("https://crm.teste/cadastro?convite=xyz")
    expect(avisos).not.toContain("Convite enviado para caio@exemplo.com")
  })
})
