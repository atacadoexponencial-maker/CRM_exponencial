// B44-04 — o número de teste da Meta saiu do CRM (auditoria de 27/10/2026). Antes era
// B21-05, que o escondia por variável; agora nem a variável ligada o traz de volta.
// O arquivo continua existindo por causa do CA-B36-28 (nenhum teste antigo some).

import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import * as acoesDoWhatsApp from "@/app/(auth)/configuracoes/whatsapp/actions"
import { WizardConexao } from "@/app/(auth)/configuracoes/whatsapp/wizard-conexao"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("B44-01 — O botão 'Conectar número de teste' não existe mais", () => {
  it("CA-B44-04: should not mostrar o número de teste no assistente, nem com a variável ligada", () => {
    vi.stubEnv("HABILITAR_NUMERO_TESTE_META", "1")
    render(<WizardConexao />)
    expect(screen.queryByText("Usar número de teste")).toBeNull()
    expect(screen.queryByText(/Ambiente de teste/)).toBeNull()
    expect(screen.getByText("Continuar com o Facebook")).toBeTruthy()
  })

  it("CA-B44-04: should not existir mais a ação antiga de conectar o número de teste", () => {
    vi.stubEnv("HABILITAR_NUMERO_TESTE_META", "1")
    expect("conectarNumeroTeste" in acoesDoWhatsApp).toBe(false)
  })
})
