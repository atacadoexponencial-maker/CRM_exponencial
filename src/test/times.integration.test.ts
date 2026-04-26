// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { listarTimes } from "@/app/(auth)/configuracoes/times/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = {
  workspaceIds: [] as string[],
  userIds: [] as string[],
  teamIds: [] as string[],
}

async function criarWorkspaceComAdmin(nome: string, email: string) {
  const { data: ws } = await serviceClient
    .from("workspaces")
    .insert({ name: nome })
    .select()
    .single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}`)

  const { data: authData } = await serviceClient.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar auth user ${email}`)

  await serviceClient.from("profiles").insert({
    id: authData.user.id,
    workspace_id: ws.id,
    name: "Admin Teste",
    role: "admin",
    status: "active",
  })

  criados.workspaceIds.push(ws.id)
  criados.userIds.push(authData.user.id)
  return { workspaceId: ws.id, userId: authData.user.id }
}

async function criarTime(workspaceId: string, name: string, isDefault: boolean) {
  const { data: time } = await serviceClient
    .from("teams")
    .insert({ workspace_id: workspaceId, name, is_default: isDefault })
    .select()
    .single()
  if (!time) throw new Error(`Falha ao criar time ${name}`)
  criados.teamIds.push(time.id)
  return time.id
}

async function autenticarComo(email: string) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  return client
}

afterAll(async () => {
  if (criados.userIds.length > 0) {
    await serviceClient.from("user_teams").delete().in("user_id", criados.userIds)
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) {
      await serviceClient.auth.admin.deleteUser(id)
    }
  }
  if (criados.teamIds.length > 0) {
    await serviceClient.from("teams").delete().in("id", criados.teamIds)
  }
  if (criados.workspaceIds.length > 0) {
    await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
  }
})

// ---------------------------------------------------------------------------

describe("Issue 21 — Listar times da empresa", () => {
  let adminAEmail: string
  let adminBEmail: string
  let timeExpansaoAId: string
  let timeRetencaoAId: string
  let timePersonalizadoAId: string

  beforeAll(async () => {
    const ts = Date.now()
    adminAEmail = `admin-times-a-${ts}@test.com`
    adminBEmail = `admin-times-b-${ts}@test.com`

    const { workspaceId: wsA } = await criarWorkspaceComAdmin("Empresa Times A", adminAEmail)
    const { workspaceId: wsB } = await criarWorkspaceComAdmin("Empresa Times B", adminBEmail)

    // Times da Empresa A
    timeExpansaoAId = await criarTime(wsA, "Expansão", true)
    timeRetencaoAId = await criarTime(wsA, "Retenção", true)
    timePersonalizadoAId = await criarTime(wsA, "Prospecção", false)

    // Times da Empresa B (para garantir isolamento)
    await criarTime(wsB, "Expansão", true)
    await criarTime(wsB, "Retenção", true)
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin da Empresa A vê apenas times da Empresa A", async () => {
    const lista = await listarTimes()
    const ids = lista.map((t) => t.id)

    expect(ids).toContain(timeExpansaoAId)
    expect(ids).toContain(timeRetencaoAId)
    expect(ids).toContain(timePersonalizadoAId)
  })

  it("admin da Empresa A NÃO vê times da Empresa B", async () => {
    const lista = await listarTimes()
    const ids = lista.map((t) => t.id)

    // Obtém os IDs dos times da empresa B para verificar isolamento
    const { data: timesB } = await serviceClient
      .from("teams")
      .select("id")
      .in("id", criados.teamIds.filter((id) => ![timeExpansaoAId, timeRetencaoAId, timePersonalizadoAId].includes(id)))

    for (const timeB of timesB ?? []) {
      expect(ids).not.toContain(timeB.id)
    }
  })

  it("lista inclui times padrão e personalizado com isDefault correto", async () => {
    const lista = await listarTimes()

    const expansao = lista.find((t) => t.id === timeExpansaoAId)
    const retencao = lista.find((t) => t.id === timeRetencaoAId)
    const personalizado = lista.find((t) => t.id === timePersonalizadoAId)

    expect(expansao).toBeDefined()
    expect(expansao!.isDefault).toBe(true)
    expect(expansao!.name).toBe("Expansão")

    expect(retencao).toBeDefined()
    expect(retencao!.isDefault).toBe(true)

    expect(personalizado).toBeDefined()
    expect(personalizado!.isDefault).toBe(false)
    expect(personalizado!.name).toBe("Prospecção")

    // Cada time retorna array de membros
    expect(Array.isArray(expansao!.membros)).toBe(true)
  })
})
