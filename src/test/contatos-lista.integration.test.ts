// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { listarContatos } from "@/app/(auth)/contatos/actions"

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
  contactIds: [] as string[],
  conversationIds: [] as string[],
  cardIds: [] as string[],
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
  role: "gerente" | "atendente",
  nome: string
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
    name: nome,
    role,
    status: "active",
  })

  criados.userIds.push(authData.user.id)
  return authData.user.id
}

async function criarContato(workspaceId: string, phone: string, name?: string) {
  const { data } = await serviceClient
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: phone, name: name ?? null })
    .select()
    .single()
  if (!data) throw new Error(`Falha ao criar contato ${phone}`)
  criados.contactIds.push(data.id)
  return data.id as string
}

async function autenticarComo(email: string) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  return client
}

// ---------------------------------------------------------------------------

describe("Issue 04 — Listar Contatos por Papel", () => {
  const ts = Date.now()
  const adminAEmail = `admin-a-${ts}@contatos-test.com`
  const adminBEmail = `admin-b-${ts}@contatos-test.com`
  const gerenteAEmail = `gerente-a-${ts}@contatos-test.com`
  const atendente1Email = `atendente-1-${ts}@contatos-test.com`
  const atendente2Email = `atendente-2-${ts}@contatos-test.com`

  let wsAId: string
  let atendente1Id: string
  let atendente2Id: string
  let contactXId: string
  let contactYId: string
  let contactZId: string
  let contactWId: string

  beforeAll(async () => {
    const { workspaceId: wsA } = await criarWorkspaceComAdmin("Empresa A Contatos", adminAEmail)
    const { workspaceId: wsB } = await criarWorkspaceComAdmin("Empresa B Contatos", adminBEmail)
    wsAId = wsA

    await criarUsuario(wsA, gerenteAEmail, "gerente", "Gerente A")
    atendente1Id = await criarUsuario(wsA, atendente1Email, "atendente", "Atendente 1")
    atendente2Id = await criarUsuario(wsA, atendente2Email, "atendente", "Atendente 2")

    // Contatos em Workspace A
    contactXId = await criarContato(wsA, "+5511991110001", "Contato X")
    contactYId = await criarContato(wsA, "+5511991110002", "Contato Y")
    contactZId = await criarContato(wsA, "+5511991110003", "Contato Z")

    // Contato em Workspace B
    contactWId = await criarContato(wsB, "+5585991110001", "Contato W")

    // Contact X atribuído ao Atendente 1 via conversa
    const { data: conv } = await serviceClient
      .from("conversations")
      .insert({
        workspace_id: wsA,
        contact_id: contactXId,
        status: "em_espera",
        assigned_to: atendente1Id,
      })
      .select()
      .single()
    if (conv) criados.conversationIds.push(conv.id)

    // Contact Y atribuído ao Atendente 2 via card de pipeline
    const { data: card } = await serviceClient
      .from("pipeline_cards")
      .insert({
        workspace_id: wsA,
        contact_id: contactYId,
        etapa: "lead",
        funil: "expansao",
        atendente_id: atendente2Id,
      })
      .select()
      .single()
    if (card) criados.cardIds.push(card.id)
  })

  afterAll(async () => {
    if (criados.cardIds.length > 0)
      await serviceClient.from("pipeline_cards").delete().in("id", criados.cardIds)
    if (criados.conversationIds.length > 0)
      await serviceClient.from("conversations").delete().in("id", criados.conversationIds)
    if (criados.contactIds.length > 0)
      await serviceClient.from("contacts").delete().in("id", criados.contactIds)
    if (criados.userIds.length > 0) {
      await serviceClient.from("profiles").delete().in("id", criados.userIds)
      for (const id of criados.userIds)
        await serviceClient.auth.admin.deleteUser(id)
    }
    if (criados.workspaceIds.length > 0)
      await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
  })

  it("Admin visualiza todos os contatos do workspace", async () => {
    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const ids = lista.map((c) => c.id)

    expect(ids).toContain(contactXId)
    expect(ids).toContain(contactYId)
    expect(ids).toContain(contactZId)
  })

  it("Gerente visualiza todos os contatos do workspace", async () => {
    const client = await autenticarComo(gerenteAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const ids = lista.map((c) => c.id)

    expect(ids).toContain(contactXId)
    expect(ids).toContain(contactYId)
    expect(ids).toContain(contactZId)
  })

  it("Atendente visualiza apenas contatos atribuídos a ele (via conversa)", async () => {
    const client = await autenticarComo(atendente1Email)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const ids = lista.map((c) => c.id)

    expect(ids).toContain(contactXId)
    expect(ids).not.toContain(contactYId)
    expect(ids).not.toContain(contactZId)
  })

  it("Atendente NÃO vê contatos de outros atendentes", async () => {
    const client = await autenticarComo(atendente2Email)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const ids = lista.map((c) => c.id)

    expect(ids).toContain(contactYId)
    expect(ids).not.toContain(contactXId)
    expect(ids).not.toContain(contactZId)
  })

  it("Admin da Empresa A NÃO vê contatos da Empresa B (isolamento multi-tenant)", async () => {
    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const ids = lista.map((c) => c.id)

    expect(ids).not.toContain(contactWId)
  })
})

// ---------------------------------------------------------------------------

describe("Issue 05 — Buscar Contato", () => {
  const ts = Date.now()
  const adminEmail = `admin-busca-${ts}@contatos-test.com`

  beforeAll(async () => {
    const { workspaceId: ws } = await criarWorkspaceComAdmin("Empresa Busca", adminEmail)

    await criarContato(ws, "+5511991110101", "Padaria do Centro")
    await criarContato(ws, "+5585991110102", "Mercearia Boa Vista")
    await criarContato(ws, "+5511991110103")
  })

  it("Busca por nome parcial retorna contatos correspondentes", async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const termo = "padaria"
    const filtrados = lista.filter((c) =>
      c.nome.toLowerCase().includes(termo) || c.telefone.toLowerCase().includes(termo)
    )

    expect(filtrados.length).toBeGreaterThan(0)
    expect(filtrados.every((c) => c.nome.toLowerCase().includes(termo))).toBe(true)
  })

  it("Busca por número de WhatsApp retorna o contato correspondente", async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const termo = "+5585991110102"
    const filtrados = lista.filter((c) =>
      c.nome.toLowerCase().includes(termo) || c.telefone.toLowerCase().includes(termo)
    )

    expect(filtrados.length).toBe(1)
    expect(filtrados[0].telefone).toBe("+5585991110102")
  })

  it("Busca sem resultado retorna lista vazia (não erro)", async () => {
    const client = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const lista = await listarContatos()
    const termo = "xyztermoquenonexiste999"
    const filtrados = lista.filter((c) =>
      c.nome.toLowerCase().includes(termo) || c.telefone.toLowerCase().includes(termo)
    )

    expect(filtrados).toHaveLength(0)
    expect(Array.isArray(filtrados)).toBe(true)
  })
})
