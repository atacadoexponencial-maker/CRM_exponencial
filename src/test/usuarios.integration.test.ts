import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient } from "@supabase/supabase-js"
import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { adicionarUsuario, listarUsuarios } from "@/app/(auth)/configuracoes/usuarios/actions"

const mockCreateClient = vi.mocked(createClient)
const mockSsrCreateClient = vi.mocked(createSsrClient)

const WORKSPACE_ID = "workspace-test-id"

function buildSsrMock(role: string) {
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: "caller-user-id" } },
    error: null,
  })
  const mockSingle = vi.fn().mockResolvedValue({
    data: { role, workspace_id: WORKSPACE_ID },
    error: null,
  })
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
  mockSsrCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as unknown as Awaited<ReturnType<typeof createSsrClient>>)
}

function buildAdminClientMock({
  createUserError = null,
  profileInsertError = null,
} = {}) {
  const mockCreateUser = vi.fn().mockResolvedValue({
    data: createUserError ? null : { user: { id: "new-user-id" } },
    error: createUserError,
  })
  const mockProfileInsert = vi.fn().mockResolvedValue({ error: profileInsertError })
  const mockUserTeamsInsert = vi.fn().mockResolvedValue({ error: null })
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") return { insert: mockProfileInsert }
    if (table === "user_teams") return { insert: mockUserTeamsInsert }
    return { insert: vi.fn().mockResolvedValue({ error: null }) }
  })
  mockCreateClient.mockReturnValue({
    auth: { admin: { createUser: mockCreateUser } },
    from: mockFrom,
  } as unknown as ReturnType<typeof createClient>)
  return { mockCreateUser, mockProfileInsert, mockUserTeamsInsert }
}

const WORKSPACE_ID_B = "workspace-empresa-b"

function buildSsrMockParaListagem(
  role: string,
  profilesLista: unknown[],
  workspaceId = WORKSPACE_ID
) {
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: "caller-user-id" } },
    error: null,
  })

  const mockSingleAdmin = vi.fn().mockResolvedValue({
    data: { role, workspace_id: workspaceId },
    error: null,
  })
  const mockEqAdmin = vi.fn().mockReturnValue({ single: mockSingleAdmin })
  const mockSelectAdmin = vi.fn().mockReturnValue({ eq: mockEqAdmin })

  const mockOrder = vi.fn().mockResolvedValue({ data: profilesLista, error: null })
  const mockEqLista = vi.fn().mockReturnValue({ order: mockOrder })
  const mockSelectLista = vi.fn().mockReturnValue({ eq: mockEqLista })

  let profilesCallCount = 0
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      profilesCallCount++
      return profilesCallCount === 1
        ? { select: mockSelectAdmin }
        : { select: mockSelectLista }
    }
    return {}
  })

  mockSsrCreateClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  } as unknown as Awaited<ReturnType<typeof createSsrClient>>)
}

function buildAdminClientParaListagem(
  users: { id: string; email: string }[]
) {
  const mockListUsers = vi.fn().mockResolvedValue({
    data: { users },
    error: null,
  })
  mockCreateClient.mockReturnValue({
    auth: { admin: { listUsers: mockListUsers } },
  } as unknown as ReturnType<typeof createClient>)
}

describe("Issue 15 — Listar usuários da empresa", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("admin da Empresa A vê apenas usuários da Empresa A", async () => {
    const profilesEmpresaA = [
      { id: "user-a1", name: "Ana Costa", role: "admin", status: "active", user_teams: [] },
      { id: "user-a2", name: "Carlos Lima", role: "gerente", status: "active", user_teams: [] },
    ]
    buildSsrMockParaListagem("admin", profilesEmpresaA, WORKSPACE_ID)
    buildAdminClientParaListagem([
      { id: "user-a1", email: "ana@empresa-a.com" },
      { id: "user-a2", email: "carlos@empresa-a.com" },
    ])

    const lista = await listarUsuarios()

    expect(lista).toHaveLength(2)
    expect(lista.map((u) => u.id)).toEqual(["user-a1", "user-a2"])
  })

  it("admin da Empresa A NÃO vê usuários da Empresa B", async () => {
    const profilesEmpresaA = [
      { id: "user-a1", name: "Ana Costa", role: "admin", status: "active", user_teams: [] },
    ]
    buildSsrMockParaListagem("admin", profilesEmpresaA, WORKSPACE_ID)
    buildAdminClientParaListagem([
      { id: "user-a1", email: "ana@empresa-a.com" },
      { id: "user-b1", email: "joao@empresa-b.com" },
    ])

    const lista = await listarUsuarios()

    const ids = lista.map((u) => u.id)
    expect(ids).toContain("user-a1")
    expect(ids).not.toContain("user-b1")
  })

  it("lista retorna nome, e-mail, papel, times e status de cada usuário", async () => {
    const profilesLista = [
      {
        id: "user-a1",
        name: "Ana Costa",
        role: "admin",
        status: "active",
        user_teams: [{ teams: [{ name: "Expansão" }] }],
      },
    ]
    buildSsrMockParaListagem("admin", profilesLista, WORKSPACE_ID)
    buildAdminClientParaListagem([{ id: "user-a1", email: "ana@empresa-a.com" }])

    const lista = await listarUsuarios()

    expect(lista).toHaveLength(1)
    const usuario = lista[0]
    expect(usuario.name).toBe("Ana Costa")
    expect(usuario.email).toBe("ana@empresa-a.com")
    expect(usuario.role).toBe("admin")
    expect(usuario.status).toBe("active")
    expect(usuario.times).toContain("Expansão")
  })
})

describe("Issue 14 — Adicionar usuário", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("admin cria usuário com papel 'gerente' e este é inserido corretamente", async () => {
    buildSsrMock("admin")
    const { mockProfileInsert } = buildAdminClientMock()

    const resultado = await adicionarUsuario({
      nome: "Carlos Lima",
      email: "carlos@empresa.com",
      senha: "senha123!",
      papel: "gerente",
      times: [],
          })

    expect(resultado.erro).toBeUndefined()
    expect(mockProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "gerente" })
    )
  })

  it("admin cria usuário com papel 'atendente' e este é inserido corretamente", async () => {
    buildSsrMock("admin")
    const { mockProfileInsert } = buildAdminClientMock()

    const resultado = await adicionarUsuario({
      nome: "Beatriz Souza",
      email: "beatriz@empresa.com",
      senha: "senha123!",
      papel: "atendente",
      times: [],
          })

    expect(resultado.erro).toBeUndefined()
    expect(mockProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: "atendente" })
    )
  })

  it("usuário criado pertence ao workspace correto", async () => {
    buildSsrMock("admin")
    const { mockProfileInsert } = buildAdminClientMock()

    await adicionarUsuario({
      nome: "João Silva",
      email: "joao@empresa.com",
      senha: "senha123!",
      papel: "gerente",
      times: [],
          })

    expect(mockProfileInsert).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: WORKSPACE_ID })
    )
  })

  it("não-admin não consegue criar usuário (retorna erro de permissão)", async () => {
    buildSsrMock("atendente")

    const resultado = await adicionarUsuario({
      nome: "Tentativa",
      email: "tentativa@empresa.com",
      senha: "senha123!",
      papel: "gerente",
      times: [],
          })

    expect(resultado.erro).toBe("Sem permissão")
    expect(mockCreateClient).not.toHaveBeenCalled()
  })
})
