// B23-01 — Conectar um número que já está em uso no WhatsApp Business do celular (tela).
// CA-B23-01: o aviso do que muda no celular aparece antes da janela da Meta.
// CA-B23-02 (parte da tela): o cartão do número mostra "Em uso também no celular".

import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock("@/app/(auth)/configuracoes/whatsapp/actions", () => ({
  completarConexaoWhatsApp: vi.fn().mockResolvedValue({}),
}))

import { PONTOS_DO_AVISO, WizardConexao } from "@/app/(auth)/configuracoes/whatsapp/wizard-conexao"
import { CartaoNumero, type NumeroConectado } from "@/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("B23-01 — Aviso do que muda no celular antes de conectar", () => {
  it("CA-B23-01: should mostrar os cinco pontos do aviso e a opção dos cards antes de abrir a janela da Meta", () => {
    const login = vi.fn()
    vi.stubGlobal("FB", { init: vi.fn(), login })
    render(<WizardConexao />)

    fireEvent.click(screen.getByText("Continuar com o Facebook"))

    // Os cinco pontos: aparelhos conectados, recursos desativados, grupos, 14 dias, cobrança.
    expect(PONTOS_DO_AVISO).toHaveLength(5)
    expect(screen.getByText(/WhatsApp Web, são desconectados/)).toBeTruthy()
    expect(screen.getByText(/Mensagens temporárias, visualização única e listas de transmissão/)).toBeTruthy()
    expect(screen.getByText(/Grupos continuam só no celular/)).toBeTruthy()
    expect(screen.getByText(/ao menos a cada 14 dias/)).toBeTruthy()
    expect(screen.getByText(/enviada pelo CRM é cobrada pela Meta/)).toBeTruthy()
    const opcao = screen.getByLabelText(/Criar cards no Funil de Entrada/) as HTMLInputElement
    expect(opcao.checked).toBe(false)
    // A janela da Meta ainda não abriu.
    expect(login).not.toHaveBeenCalled()

    // Só o botão do aviso abre a janela, e pelo caminho do WhatsApp Business do celular.
    fireEvent.click(screen.getByText("Entendi, abrir a janela da Meta"))
    expect(login).toHaveBeenCalledTimes(1)
    const opcoes = login.mock.calls[0][1] as { extras: { featureType: string } }
    expect(opcoes.extras.featureType).toBe("whatsapp_business_app_onboarding")
  })
})

describe("B23-01 — Cartão do número em uso também no celular", () => {
  const base: NumeroConectado = {
    id: "c1",
    canal: "meta",
    phone_number: "5511999998888",
    display_name: "Loja",
    state: "connected",
    state_reason: null,
  }

  it("CA-B23-02: should mostrar 'Em uso também no celular' no cartão do número conectado em coexistência", () => {
    render(<CartaoNumero numero={{ ...base, em_uso_no_celular: true }} />)
    expect(screen.getByText("Conectado")).toBeTruthy()
    expect(screen.getByText("Em uso também no celular")).toBeTruthy()
  })

  it("CA-B23-02: should not mostrar a indicação num número da Meta que não está no celular", () => {
    render(<CartaoNumero numero={{ ...base, em_uso_no_celular: false }} />)
    expect(screen.queryByText("Em uso também no celular")).toBeNull()
  })
})
