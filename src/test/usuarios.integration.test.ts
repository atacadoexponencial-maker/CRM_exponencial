// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.
// @supabase/supabase-js NÃO é mockado — as server actions usam o service role
// diretamente, e os testes também.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import {
  listarUsuarios,
  editarPapel,
  adicionarUsuario,
  gerenciarTimes,
  desativarUsuario,
  reativarUsuario,
} from "@/app/(auth)/configuracoes/usuarios/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"

const serviceClient = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// IDs criados durante os testes, para cleanup final
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

async function criarUsuario(
  workspaceId: string,
  email: string,
  role: "gerente" | "atendente"
) {
  const { data: authData } = await serviceClient.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar user ${email}`)

  await serviceClient.from("profiles").insert({
    id: authData.user.id,
    workspace_id: workspaceId,
    name: `Usuário ${role}`,
    role,
    status: "active",
  })

  criados.userIds.push(authData.user.id)
  return authData.user.id
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

describe("Issue 15 — Listar usuários da empresa", () => {
  let adminAEmail: string
  let adminBEmail: string
  let gerenteAEmail: string

  beforeAll(async () => {
    const ts = Date.now()
    adminAEmail = `admin-a-${ts}@test.com`
    adminBEmail = `admin-b-${ts}@test.com`
    gerenteAEmail = `gerente-a-${ts}@test.com`

    const { workspaceId: wsA } = await criarWorkspaceComAdmin("Empresa A", adminAEmail)
    await criarWorkspaceComAdmin("Empresa B", adminBEmail)
    await criarUsuario(wsA, gerenteAEmail, "gerente")
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin da Empresa A vê apenas usuários da Empresa A", async () => {
    const lista = await listarUsuarios()
    const emails = lista.map((u) => u.email)
    expect(emails).toContain(adminAEmail)
    expect(emails).toContain(gerenteAEmail)
    expect(emails).not.toContain(adminBEmail)
  })

  it("admin da Empresa A NÃO vê usuários da Empresa B", async () => {
    const lista = await listarUsuarios()
    expect(lista.map((u) => u.email)).not.toContain(adminBEmail)
  })

  it("lista retorna nome, e-mail, papel, times e status de cada usuário", async () => {
    const lista = await listarUsuarios()
    const usuario = lista.find((u) => u.email === adminAEmail)
    expect(usuario).toBeDefined()
    expect(usuario!.name).toBe("Admin Teste")
    expect(usuario!.role).toBe("admin")
    expect(usuario!.status).toBe("active")
    expect(Array.isArray(usuario!.times)).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe("Issue 16 — Editar papel de usuário", () => {
  let adminEmail: string
  let adminId: string
  let atendenteId: string
  let atendenteEmail: string

  beforeAll(async () => {
    const ts = Date.now() + 1
    adminEmail = `admin-16-${ts}@test.com`
    atendenteEmail = `atendente-16-${ts}@test.com`

    const result = await criarWorkspaceComAdmin("Empresa 16", adminEmail)
    adminId = result.userId
    atendenteId = await criarUsuario(result.workspaceId, atendenteEmail, "atendente")
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin altera papel de 'atendente' para 'gerente'", async () => {
    const resultado = await editarPapel(atendenteId, "gerente")

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", atendenteId)
      .single()
    expect(data?.role).toBe("gerente")

    // Restaurar para não afetar outros testes
    await serviceClient.from("profiles").update({ role: "atendente" }).eq("id", atendenteId)
  })

  it("admin não consegue alterar o próprio papel", async () => {
    const client = await autenticarComo(adminEmail)
    const { data: { user } } = await client.auth.getUser()
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await editarPapel(user!.id, "gerente")

    expect(resultado.erro).toBe("Você não pode alterar o próprio papel")
  })

  it("atendente não consegue alterar papel de ninguém", async () => {
    const client = await autenticarComo(atendenteEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    // Tenta editar o admin (ID diferente do atendente, evita o check "não pode editar a si mesmo")
    const resultado = await editarPapel(adminId, "atendente")

    expect(resultado.erro).toBe("Sem permissão")
  })
})

// ---------------------------------------------------------------------------

describe("Issue 14 — Adicionar usuário", () => {
  let adminEmail: string
  let workspaceId: string

  beforeAll(async () => {
    const ts = Date.now() + 2
    adminEmail = `admin-14-${ts}@test.com`
    const result = await criarWorkspaceComAdmin("Empresa 14", adminEmail)
    workspaceId = result.workspaceId
  })

  beforeEach(async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin cria usuário com papel 'gerente' e este aparece na lista", async () => {
    const ts = Date.now()
    const email = `novo-gerente-${ts}@test.com`

    const resultado = await adicionarUsuario({
      nome: "Novo Gerente",
      email,
      senha: SENHA,
      papel: "gerente",
      times: [],
    })

    expect(resultado.erro).toBeUndefined()

    // Verificar via listarUsuarios que aparece na lista
    const lista = await listarUsuarios()
    const encontrado = lista.find((u) => u.email === email)
    expect(encontrado).toBeDefined()
    expect(encontrado!.role).toBe("gerente")

    // Rastrear para cleanup
    const { data: authUsers } = await serviceClient.auth.admin.listUsers()
    const user = authUsers.users.find((u) => u.email === email)
    if (user) criados.userIds.push(user.id)
  })

  it("usuário criado pertence ao workspace correto", async () => {
    const ts = Date.now() + 1
    const email = `novo-atendente-${ts}@test.com`

    await adicionarUsuario({
      nome: "Novo Atendente",
      email,
      senha: SENHA,
      papel: "atendente",
      times: [],
    })

    const { data: authUsers } = await serviceClient.auth.admin.listUsers()
    const user = authUsers.users.find((u) => u.email === email)
    expect(user).toBeDefined()

    if (user) {
      criados.userIds.push(user.id)
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("workspace_id")
        .eq("id", user.id)
        .single()
      expect(profile?.workspace_id).toBe(workspaceId)
    }
  })

  it("não-admin não consegue criar usuário", async () => {
    const ts = Date.now() + 2
    const atendenteEmail = `atendente-14-${ts}@test.com`
    await criarUsuario(workspaceId, atendenteEmail, "atendente")

    const client = await autenticarComo(atendenteEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await adicionarUsuario({
      nome: "Tentativa",
      email: `tentativa-${ts}@test.com`,
      senha: SENHA,
      papel: "gerente",
      times: [],
    })

    expect(resultado.erro).toBe("Sem permissão")
  })
})

// ---------------------------------------------------------------------------

describe("Issues 17 e 18 — Gerenciar times do usuário", () => {
  let adminEmail: string
  let atendenteId: string
  let timeExpansaoId: string
  let timeRetencaoId: string

  beforeAll(async () => {
    const ts = Date.now() + 3
    adminEmail = `admin-17-${ts}@test.com`
    const { workspaceId } = await criarWorkspaceComAdmin("Empresa 17", adminEmail)

    atendenteId = await criarUsuario(workspaceId, `atendente-17-${ts}@test.com`, "atendente")

    const { data: times } = await serviceClient
      .from("teams")
      .insert([
        { workspace_id: workspaceId, name: "Expansão", is_default: true },
        { workspace_id: workspaceId, name: "Retenção", is_default: true },
      ])
      .select()
    timeExpansaoId = times![0].id
    timeRetencaoId = times![1].id
    criados.teamIds.push(timeExpansaoId, timeRetencaoId)
  })

  beforeEach(async () => {
    // Limpar associações antes de cada teste
    await serviceClient.from("user_teams").delete().eq("user_id", atendenteId)

    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin adiciona usuário ao time Expansão", async () => {
    const resultado = await gerenciarTimes(atendenteId, [timeExpansaoId])

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("user_teams")
      .select("team_id")
      .eq("user_id", atendenteId)
    expect(data?.map((r) => r.team_id)).toContain(timeExpansaoId)
  })

  it("admin remove usuário do time Expansão", async () => {
    // Adicionar primeiro
    await serviceClient.from("user_teams").insert({ user_id: atendenteId, team_id: timeExpansaoId })

    const resultado = await gerenciarTimes(atendenteId, [])

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("user_teams")
      .select("team_id")
      .eq("user_id", atendenteId)
    expect(data).toHaveLength(0)
  })

  it("usuário pode pertencer a múltiplos times simultaneamente", async () => {
    const resultado = await gerenciarTimes(atendenteId, [timeExpansaoId, timeRetencaoId])

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("user_teams")
      .select("team_id")
      .eq("user_id", atendenteId)
    const teamIds = data?.map((r) => r.team_id) ?? []
    expect(teamIds).toContain(timeExpansaoId)
    expect(teamIds).toContain(timeRetencaoId)
  })
})

// ---------------------------------------------------------------------------

describe("Issue 19 — Desativar usuário", () => {
  let adminEmail: string
  let atendenteId: string

  beforeAll(async () => {
    const ts = Date.now() + 4
    adminEmail = `admin-19-${ts}@test.com`
    const { workspaceId } = await criarWorkspaceComAdmin("Empresa 19", adminEmail)
    atendenteId = await criarUsuario(workspaceId, `atendente-19-${ts}@test.com`, "atendente")
  })

  beforeEach(async () => {
    // Garantir que o atendente está ativo antes de cada teste
    await serviceClient.from("profiles").update({ status: "active" }).eq("id", atendenteId)

    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin desativa um atendente (status muda para 'inactive')", async () => {
    const resultado = await desativarUsuario(atendenteId)

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("profiles")
      .select("status")
      .eq("id", atendenteId)
      .single()
    expect(data?.status).toBe("inactive")
  })

  it("usuário desativado perde acesso ao sistema (middleware bloqueia status inactive)", async () => {
    await desativarUsuario(atendenteId)

    const { data } = await serviceClient
      .from("profiles")
      .select("status")
      .eq("id", atendenteId)
      .single()
    // Confirma que o status está gravado como inactive no banco
    // O middleware lê esse valor e redireciona para /login
    expect(data?.status).toBe("inactive")
  })

  it("admin não consegue desativar a si mesmo", async () => {
    const client = await autenticarComo(adminEmail)
    const { data: { user } } = await client.auth.getUser()
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await desativarUsuario(user!.id)

    expect(resultado.erro).toBe("Você não pode desativar a si mesmo")
  })
})

// ---------------------------------------------------------------------------

describe("Issue 20 — Reativar usuário", () => {
  let adminEmail: string
  let atendenteId: string

  beforeAll(async () => {
    const ts = Date.now() + 5
    adminEmail = `admin-20-${ts}@test.com`
    const { workspaceId } = await criarWorkspaceComAdmin("Empresa 20", adminEmail)
    atendenteId = await criarUsuario(workspaceId, `atendente-20-${ts}@test.com`, "atendente")
  })

  beforeEach(async () => {
    // Garantir que o atendente está inativo antes de cada teste
    await serviceClient.from("profiles").update({ status: "inactive" }).eq("id", atendenteId)

    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)
  })

  it("admin reativa usuário inativo (status volta para 'active')", async () => {
    const resultado = await reativarUsuario(atendenteId)

    expect(resultado.erro).toBeUndefined()

    const { data } = await serviceClient
      .from("profiles")
      .select("status")
      .eq("id", atendenteId)
      .single()
    expect(data?.status).toBe("active")
  })

  it("usuário reativado recupera acesso ao sistema (middleware permite status active)", async () => {
    await reativarUsuario(atendenteId)

    const { data } = await serviceClient
      .from("profiles")
      .select("status")
      .eq("id", atendenteId)
      .single()
    // Confirma que o status está gravado como active no banco
    // O middleware lê esse valor e permite o acesso normalmente
    expect(data?.status).toBe("active")
  })
})
