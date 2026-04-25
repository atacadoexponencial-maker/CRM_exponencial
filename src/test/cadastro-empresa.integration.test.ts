import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@supabase/supabase-js"
import { verificarEmailEmUso } from "@/app/cadastro/actions"

const mockCreateClient = vi.mocked(createClient)

describe("verificarEmailEmUso", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna true se e-mail já está cadastrado", async () => {
    const mockGetUserByEmail = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123", email: "joao@empresa.com" } },
      error: null,
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { getUserByEmail: mockGetUserByEmail } },
    } as ReturnType<typeof createClient>)

    const result = await verificarEmailEmUso("joao@empresa.com")

    expect(result).toBe(true)
    expect(mockGetUserByEmail).toHaveBeenCalledWith("joao@empresa.com")
  })

  it("retorna false se e-mail não está cadastrado", async () => {
    const mockGetUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "User not found" },
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { getUserByEmail: mockGetUserByEmail } },
    } as ReturnType<typeof createClient>)

    const result = await verificarEmailEmUso("novo@empresa.com")

    expect(result).toBe(false)
  })

  it("lança erro em caso de falha inesperada no Supabase", async () => {
    const mockGetUserByEmail = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: "Internal server error" },
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { getUserByEmail: mockGetUserByEmail } },
    } as ReturnType<typeof createClient>)

    await expect(verificarEmailEmUso("qualquer@empresa.com")).rejects.toThrow(
      "Erro ao verificar e-mail"
    )
  })
})
