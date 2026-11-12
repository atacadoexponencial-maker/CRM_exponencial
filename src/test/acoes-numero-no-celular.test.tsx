// B23-06 — Ações do número em uso no celular (parte de tela do CA-B23-30): o diálogo
// de remover explica que é preciso desconectar também no aplicativo, e os botões
// Desconectar/Reconectar não aparecem (a Meta não deixa o CRM desligar; voltar é pela
// janela dela). E o aviso do CA-B23-31: remover deixa o número livre para qualquer empresa.

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/whatsapp/actions", () => ({
  desconectarWhatsApp: vi.fn(),
  reconectarWhatsApp: vi.fn(),
  reinscreverWebhookWhatsApp: vi.fn(),
  removerConexaoWhatsApp: vi.fn().mockResolvedValue({}),
}))

import { AcoesWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/acoes-whatsapp"
import { CartaoNumero } from "@/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero"

describe("B23-06 — Cartão do número desconectado pelo celular", () => {
  it.each([
    ["desconectado_pelo_celular", "Desconectado pelo celular."],
    ["sem_uso_do_aplicativo", "Desconectado por falta de uso do aplicativo."],
    ["mudou_de_aparelho", "O número mudou de aparelho ou de número."],
  ] as const)("motivo %s aparece em linguagem simples no cartão", (motivo, texto) => {
    render(
      <CartaoNumero
        numero={{ id: "cx-1", canal: "meta", phone_number: "5511999990000", display_name: "Loja", state: "disconnected", state_reason: motivo, em_uso_no_celular: true }}
      />
    )
    expect(screen.getByText("Desconectado")).toBeTruthy()
    expect(screen.getByText(texto)).toBeTruthy()
  })

  it("CA-B23-26: should mostrar no cartão do número 'Desconectado' e o motivo em linguagem simples", () => {
    render(
      <CartaoNumero
        numero={{ id: "cx-1", canal: "meta", phone_number: "5511999990000", display_name: "Loja", state: "disconnected", state_reason: "sem_uso_do_aplicativo", em_uso_no_celular: true }}
      />
    )
    expect(screen.getByText("Desconectado")).toBeTruthy()
    expect(screen.getByText("Desconectado por falta de uso do aplicativo.")).toBeTruthy()
  })
})

describe("B23-06 — Remover número em uso no celular", () => {
  it("CA-B23-30: should explicar no diálogo que é preciso desconectar também no aplicativo (Configurações > Conta > Plataforma Comercial)", () => {
    render(<AcoesWhatsApp conexaoId="cx-1" status="connected" emUsoNoCelular />)
    fireEvent.click(screen.getByRole("button", { name: "Remover número" }))
    expect(screen.getByText(/desconecte também no aplicativo/)).toBeTruthy()
    expect(screen.getByText(/Configurações > Conta > Plataforma Comercial/)).toBeTruthy()
    expect(screen.getByText(/As conversas e os contatos ficam no CRM/)).toBeTruthy()
    // Desligar e religar não são daqui.
    expect(screen.queryByRole("button", { name: "Desconectar" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Reconectar" })).toBeNull()
  })

  it("should manter os botões de hoje e não falar do aplicativo no número comum da Meta", () => {
    render(<AcoesWhatsApp conexaoId="cx-2" status="connected" />)
    expect(screen.getByRole("button", { name: "Desconectar" })).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Remover número" }))
    expect(screen.queryByText(/Plataforma Comercial/)).toBeNull()
  })

  it("CA-B23-31: should avisar no diálogo de remover que o número fica livre para qualquer empresa e que Desconectar o guarda", () => {
    render(<AcoesWhatsApp conexaoId="cx-3" status="connected" />)
    fireEvent.click(screen.getByRole("button", { name: "Remover número" }))

    expect(screen.getByText(/Remover tira este número do CRM de vez/)).toBeTruthy()
    expect(screen.getByText(/Ninguém da sua empresa envia nem recebe mais mensagens por ele/)).toBeTruthy()
    expect(screen.getByText(/As conversas e os contatos ficam no CRM, só para consulta/)).toBeTruthy()
    expect(screen.getByText("O número fica livre:")).toBeTruthy()
    expect(screen.getByText(/qualquer empresa pode conectá-lo, não só a sua/)).toBeTruthy()
    expect(screen.getByText(/Se a sua empresa conectar este número de novo, as conversas voltam/)).toBeTruthy()
    // Quem só quer pausar é mandado para o Desconectar.
    expect(screen.getByText(/o número fica guardado para a sua empresa/)).toBeTruthy()
    // O botão de confirmar diz o que faz.
    expect(screen.getByRole("button", { name: "Remover e liberar o número" })).toBeTruthy()
  })

  it("CA-B23-31: should dar o mesmo aviso de número livre no número em uso no celular", () => {
    render(<AcoesWhatsApp conexaoId="cx-4" status="connected" emUsoNoCelular />)
    fireEvent.click(screen.getByRole("button", { name: "Remover número" }))

    expect(screen.getByText("O número fica livre:")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Remover e liberar o número" })).toBeTruthy()
  })
})
