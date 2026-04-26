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
import { listarTimes, criarTime as criarTimeAction, editarNomeTime, excluirTime, gerenciarMembrosTime } from "@/app/(auth)/configuracoes/times/actions"

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

// ---------------------------------------------------------------------------

describe("Issue 22 — Criar time personalizado", () => {
  let adminEmail: string
  let workspaceId: string

  beforeAll(async () => {
    const ts = Date.now()
    adminEmail = `admin-criar-time-${ts}@test.com`
    const { workspaceId: wsId } = await criarWorkspaceComAdmin("Empresa Criar Time", adminEmail)
    workspaceId = wsId
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin cria time com nome válido", async () => {
    const resultado = await criarTimeAction("Time Novo Valido")
    expect(resultado.erro).toBeUndefined()

    const { data: times } = await serviceClient
      .from("teams")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("name", "Time Novo Valido")

    expect(times).toHaveLength(1)
    if (times?.[0]) criados.teamIds.push(times[0].id)
  })

  it("time criado tem is_default = false", async () => {
    const resultado = await criarTimeAction("Time Personalizado Test")
    expect(resultado.erro).toBeUndefined()

    const { data: times } = await serviceClient
      .from("teams")
      .select("id, is_default")
      .eq("workspace_id", workspaceId)
      .eq("name", "Time Personalizado Test")

    expect(times).toHaveLength(1)
    expect(times![0].is_default).toBe(false)
    if (times?.[0]) criados.teamIds.push(times[0].id)
  })

  it("time criado pertence ao workspace correto", async () => {
    const resultado = await criarTimeAction("Time do Workspace Correto")
    expect(resultado.erro).toBeUndefined()

    const { data: times } = await serviceClient
      .from("teams")
      .select("id, workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("name", "Time do Workspace Correto")

    expect(times).toHaveLength(1)
    expect(times![0].workspace_id).toBe(workspaceId)
    if (times?.[0]) criados.teamIds.push(times[0].id)
  })
})

// ---------------------------------------------------------------------------

describe("Issue 23 — Editar nome de time personalizado", () => {
  let adminEmail: string
  let timePersonalizadoId: string
  let timeExpansaoId: string
  let timeRetencaoId: string

  beforeAll(async () => {
    const ts = Date.now()
    adminEmail = `admin-editar-time-${ts}@test.com`
    const { workspaceId } = await criarWorkspaceComAdmin("Empresa Editar Time", adminEmail)

    timePersonalizadoId = await criarTime(workspaceId, "Time Para Editar", false)
    timeExpansaoId = await criarTime(workspaceId, "Expansão", true)
    timeRetencaoId = await criarTime(workspaceId, "Retenção", true)
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin edita nome de time personalizado", async () => {
    const resultado = await editarNomeTime(timePersonalizadoId, "Nome Editado")
    expect(resultado.erro).toBeUndefined()

    const { data: time } = await serviceClient
      .from("teams")
      .select("name")
      .eq("id", timePersonalizadoId)
      .single()

    expect(time?.name).toBe("Nome Editado")
  })

  it("admin não consegue editar nome do time 'Expansão'", async () => {
    const resultado = await editarNomeTime(timeExpansaoId, "Novo Nome Expansão")
    expect(resultado.erro).toBeDefined()
  })

  it("admin não consegue editar nome do time 'Retenção'", async () => {
    const resultado = await editarNomeTime(timeRetencaoId, "Novo Nome Retenção")
    expect(resultado.erro).toBeDefined()
  })
})

// ---------------------------------------------------------------------------

describe("Issue 24 — Excluir time personalizado", () => {
  let adminEmail: string
  let workspaceId: string
  let membroId: string
  let timeExpansaoId: string
  let timeRetencaoId: string

  beforeAll(async () => {
    const ts = Date.now()
    adminEmail = `admin-excluir-time-${ts}@test.com`
    const resultado = await criarWorkspaceComAdmin("Empresa Excluir Time", adminEmail)
    workspaceId = resultado.workspaceId

    // Membro que será associado ao time para verificar que não é excluído
    const { data: authData } = await serviceClient.auth.admin.createUser({
      email: `membro-excluir-${ts}@test.com`,
      password: "senha-test-123!",
      email_confirm: true,
    })
    membroId = authData.user!.id
    await serviceClient.from("profiles").insert({
      id: membroId,
      workspace_id: workspaceId,
      name: "Membro Teste",
      role: "atendente",
      status: "active",
    })
    criados.userIds.push(membroId)

    timeExpansaoId = await criarTime(workspaceId, "Expansão", true)
    timeRetencaoId = await criarTime(workspaceId, "Retenção", true)
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin exclui time personalizado", async () => {
    const timeId = await criarTime(workspaceId, "Time Para Excluir", false)

    const resultado = await excluirTime(timeId)
    expect(resultado.erro).toBeUndefined()

    const { data: time } = await serviceClient
      .from("teams")
      .select("id")
      .eq("id", timeId)
      .maybeSingle()

    expect(time).toBeNull()
    // Remove do array de cleanup pois já foi excluído
    const idx = criados.teamIds.indexOf(timeId)
    if (idx !== -1) criados.teamIds.splice(idx, 1)
  })

  it("usuários do time excluído não são excluídos (apenas desassociados)", async () => {
    const timeId = await criarTime(workspaceId, "Time Com Membro", false)
    await serviceClient.from("user_teams").insert({ user_id: membroId, team_id: timeId })

    const resultado = await excluirTime(timeId)
    expect(resultado.erro).toBeUndefined()

    // Time excluído
    const { data: time } = await serviceClient
      .from("teams").select("id").eq("id", timeId).maybeSingle()
    expect(time).toBeNull()

    // Membro ainda existe
    const { data: perfil } = await serviceClient
      .from("profiles").select("id").eq("id", membroId).maybeSingle()
    expect(perfil).not.toBeNull()

    // Associação removida via cascade
    const { data: assoc } = await serviceClient
      .from("user_teams").select("user_id").eq("user_id", membroId).eq("team_id", timeId).maybeSingle()
    expect(assoc).toBeNull()

    const idx = criados.teamIds.indexOf(timeId)
    if (idx !== -1) criados.teamIds.splice(idx, 1)
  })

  it("admin não consegue excluir o time 'Expansão'", async () => {
    const resultado = await excluirTime(timeExpansaoId)
    expect(resultado.erro).toBeDefined()
  })

  it("admin não consegue excluir o time 'Retenção'", async () => {
    const resultado = await excluirTime(timeRetencaoId)
    expect(resultado.erro).toBeDefined()
  })
})

// ---------------------------------------------------------------------------

describe("Issue 25 — Gerenciar membros do time", () => {
  let adminEmail: string
  let workspaceId: string
  let usuarioId: string
  let timeId: string
  let timeExpansaoId: string
  let timeRetencaoId: string

  beforeAll(async () => {
    const ts = Date.now()
    adminEmail = `admin-membros-${ts}@test.com`
    const resultado = await criarWorkspaceComAdmin("Empresa Membros Time", adminEmail)
    workspaceId = resultado.workspaceId

    const { data: authData } = await serviceClient.auth.admin.createUser({
      email: `usuario-membros-${ts}@test.com`,
      password: "senha-test-123!",
      email_confirm: true,
    })
    usuarioId = authData.user!.id
    await serviceClient.from("profiles").insert({
      id: usuarioId,
      workspace_id: workspaceId,
      name: "Usuário Membros",
      role: "atendente",
      status: "active",
    })
    criados.userIds.push(usuarioId)

    timeId = await criarTime(workspaceId, "Time Gerenciar Membros", false)
    timeExpansaoId = await criarTime(workspaceId, "Expansão", true)
    timeRetencaoId = await criarTime(workspaceId, "Retenção", true)
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin adiciona usuário a um time pela tela de times", async () => {
    const resultado = await gerenciarMembrosTime(timeId, [usuarioId])
    expect(resultado.erro).toBeUndefined()

    const { data: assoc } = await serviceClient
      .from("user_teams")
      .select("user_id")
      .eq("team_id", timeId)
      .eq("user_id", usuarioId)
      .maybeSingle()

    expect(assoc).not.toBeNull()
  })

  it("admin remove usuário de um time pela tela de times", async () => {
    // Garante que o usuário está no time antes de remover
    await serviceClient.from("user_teams").upsert({ user_id: usuarioId, team_id: timeId })

    const resultado = await gerenciarMembrosTime(timeId, [])
    expect(resultado.erro).toBeUndefined()

    const { data: assoc } = await serviceClient
      .from("user_teams")
      .select("user_id")
      .eq("team_id", timeId)
      .eq("user_id", usuarioId)
      .maybeSingle()

    expect(assoc).toBeNull()
  })

  it("mesmo usuário pode estar em Expansão e Retenção ao mesmo tempo", async () => {
    const r1 = await gerenciarMembrosTime(timeExpansaoId, [usuarioId])
    expect(r1.erro).toBeUndefined()

    const r2 = await gerenciarMembrosTime(timeRetencaoId, [usuarioId])
    expect(r2.erro).toBeUndefined()

    const { data: assocExpansao } = await serviceClient
      .from("user_teams").select("user_id").eq("team_id", timeExpansaoId).eq("user_id", usuarioId).maybeSingle()
    const { data: assocRetencao } = await serviceClient
      .from("user_teams").select("user_id").eq("team_id", timeRetencaoId).eq("user_id", usuarioId).maybeSingle()

    expect(assocExpansao).not.toBeNull()
    expect(assocRetencao).not.toBeNull()
  })
})
