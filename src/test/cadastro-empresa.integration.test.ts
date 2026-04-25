import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@supabase/supabase-js"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { verificarEmailEmUso, criarWorkspace, criarAdminETimesPadrao } from "@/app/cadastro/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)

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
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: "user-123", email: "joao@empresa.com" }] },
      error: null,
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers } },
    } as unknown as ReturnType<typeof createClient>)

    const result = await verificarEmailEmUso("joao@empresa.com")

    expect(result).toBe(true)
    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 })
  })

  it("retorna false se e-mail não está cadastrado", async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: "user-456", email: "outro@empresa.com" }] },
      error: null,
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers } },
    } as unknown as ReturnType<typeof createClient>)

    const result = await verificarEmailEmUso("novo@empresa.com")

    expect(result).toBe(false)
  })

  it("lança erro em caso de falha inesperada no Supabase", async () => {
    const mockListUsers = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Internal server error" },
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { listUsers: mockListUsers } },
    } as unknown as ReturnType<typeof createClient>)

    await expect(verificarEmailEmUso("qualquer@empresa.com")).rejects.toThrow(
      "Erro ao verificar e-mail"
    )
  })
})

describe("Issue 10 — Criar workspace isolado da empresa", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("cria um registro na tabela workspaces com os dados corretos", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: "workspace-abc" },
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createClient>)

    const id = await criarWorkspace("Empresa Teste Ltda")

    expect(id).toBe("workspace-abc")
    expect(mockFrom).toHaveBeenCalledWith("workspaces")
    expect(mockInsert).toHaveBeenCalledWith({ name: "Empresa Teste Ltda" })
  })

  it("empresa A não consegue acessar dados da empresa B — workspaces têm IDs distintos", async () => {
    let callCount = 0
    const ids = ["workspace-empresa-a", "workspace-empresa-b"]
    const mockSingle = vi.fn().mockImplementation(() => {
      return Promise.resolve({ data: { id: ids[callCount++] }, error: null })
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createClient>)

    const idA = await criarWorkspace("Empresa A")
    const idB = await criarWorkspace("Empresa B")

    expect(idA).not.toBe(idB)
    expect(idA).toBe("workspace-empresa-a")
    expect(idB).toBe("workspace-empresa-b")
  })

  it("dois cadastros simultâneos criam dois workspaces distintos", async () => {
    let callCount = 0
    const ids = ["workspace-1", "workspace-2"]
    const mockSingle = vi.fn().mockImplementation(() => {
      return Promise.resolve({ data: { id: ids[callCount++] }, error: null })
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createClient>)

    const [id1, id2] = await Promise.all([
      criarWorkspace("Empresa 1"),
      criarWorkspace("Empresa 2"),
    ])

    expect(id1).not.toBe(id2)
  })
})

describe("Issue 11 — Criar Admin e times padrão ao cadastrar empresa", () => {
  const WORKSPACE_ID = "workspace-test-id"

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  beforeEach(() => {
    vi.clearAllMocks()

    const mockSignIn = vi.fn().mockResolvedValue({ error: null })
    mockSsrCreateClient.mockResolvedValue({
      auth: { signInWithPassword: mockSignIn },
    } as unknown as Awaited<ReturnType<typeof createSsrClient>>)
  })

  function buildAdminClientMock(teamsData: unknown[] = []) {
    const mockCreateUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-admin-id" } },
      error: null,
    })
    const mockProfileInsert = vi.fn().mockResolvedValue({ error: null })
    const mockTeamsInsert = vi.fn().mockImplementation((data: unknown[]) => {
      teamsData.push(...data)
      return Promise.resolve({ error: null })
    })
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") return { insert: mockProfileInsert }
      if (table === "teams") return { insert: mockTeamsInsert }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })
    mockCreateClient.mockReturnValue({
      auth: { admin: { createUser: mockCreateUser } },
      from: mockFrom,
    } as unknown as ReturnType<typeof createClient>)
    return { mockCreateUser, mockProfileInsert, mockTeamsInsert, mockFrom }
  }

  it("primeiro usuário criado tem papel 'admin'", async () => {
    const { mockProfileInsert } = buildAdminClientMock()

    await criarAdminETimesPadrao(WORKSPACE_ID, "João Silva", "joao@empresa.com", "senha123!")

    expect(mockProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "admin", workspace_id: WORKSPACE_ID })
    )
  })

  it("times 'Expansão' e 'Retenção' são criados automaticamente", async () => {
    const captured: unknown[] = []
    buildAdminClientMock(captured)

    await criarAdminETimesPadrao(WORKSPACE_ID, "João Silva", "joao@empresa.com", "senha123!")

    const names = (captured as Array<{ name: string }>).map((t) => t.name)
    expect(names).toContain("Expansão")
    expect(names).toContain("Retenção")
  })

  it("times padrão têm flag is_default = true", async () => {
    const captured: unknown[] = []
    buildAdminClientMock(captured)

    await criarAdminETimesPadrao(WORKSPACE_ID, "João Silva", "joao@empresa.com", "senha123!")

    const teams = captured as Array<{ is_default: boolean }>
    expect(teams.every((t) => t.is_default === true)).toBe(true)
  })

  it("times padrão pertencem à empresa correta (não vazam para outra empresa)", async () => {
    const captured: unknown[] = []
    buildAdminClientMock(captured)

    await criarAdminETimesPadrao(WORKSPACE_ID, "João Silva", "joao@empresa.com", "senha123!")

    const teams = captured as Array<{ workspace_id: string }>
    expect(teams.every((t) => t.workspace_id === WORKSPACE_ID)).toBe(true)
  })
})
