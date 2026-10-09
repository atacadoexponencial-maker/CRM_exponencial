// B21-05 — o número de teste da Meta só existe onde a variável o libera (auditoria de
// 06/10/2026, rodada 3). Sem rede: o client do Supabase é um espião.

import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const criarClient = vi.fn()
vi.mock("@/integrations/supabase/server", () => ({ createClient: (...args: unknown[]) => criarClient(...args) }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { conectarNumeroTeste } from "@/app/(auth)/configuracoes/whatsapp/actions"
import { WizardConexao } from "@/app/(auth)/configuracoes/whatsapp/wizard-conexao"

afterEach(() => {
  vi.unstubAllEnvs()
  criarClient.mockReset()
})

describe("B21-05 — Número de teste da Meta só com a variável ligada", () => {
  it("should not mostrar o número de teste no assistente quando a variável está desligada", () => {
    render(<WizardConexao />)
    expect(screen.queryByText("Usar número de teste")).toBeNull()
    expect(screen.getByText("Continuar com o Facebook")).toBeTruthy()
  })

  it("should mostrar o número de teste no assistente quando a variável está ligada", () => {
    render(<WizardConexao mostrarNumeroTeste />)
    expect(screen.getByText("Usar número de teste")).toBeTruthy()
  })

  it("should recusar a ação com a variável desligada, sem nem consultar o banco", async () => {
    vi.stubEnv("HABILITAR_NUMERO_TESTE_META", "")
    expect(await conectarNumeroTeste()).toEqual({ erro: "O número de teste não está disponível neste ambiente." })
    expect(criarClient).not.toHaveBeenCalled()
  })

  it("should seguir o fluxo de sempre com a variável ligada", async () => {
    vi.stubEnv("HABILITAR_NUMERO_TESTE_META", "1")
    criarClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    expect(await conectarNumeroTeste()).toEqual({ erro: "Não autorizado" })
    expect(criarClient).toHaveBeenCalled()
  })
})
