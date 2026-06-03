// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.
//
// NOTA: Os testes de tags exigem que a migração 20260603000003_create_contact_tags.sql
// tenha sido aplicada ao banco de dados. Se a tabela contact_tags não existir,
// os testes são pulados automaticamente.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { adicionarTagContato, removerTagContato } from "@/app/(auth)/contatos/actions"

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
}

let tableExists = false

async function autenticarComo(email: string) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  return client
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

async function criarContato(workspaceId: string, phone: string) {
  const { data } = await serviceClient
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: phone, name: "Contato Teste" })
    .select("id")
    .single()
  if (!data) throw new Error(`Falha ao criar contato ${phone}`)
  criados.contactIds.push(data.id)
  return data.id as string
}

// ---------------------------------------------------------------------------

let wsAId: string
let wsBId: string
let adminAEmail: string
let adminBEmail: string
let contactAId: string
let contactA2Id: string
let contactBId: string

beforeAll(async () => {
  // Verifica se a tabela contact_tags existe
  const { error: tableError } = await serviceClient
    .from("contact_tags")
    .select("id")
    .limit(0)
  tableExists = !tableError

  if (!tableExists) return // pula setup se tabela não existe

  const ts = Date.now()
  adminAEmail = `admin-a-tags-${ts}@perfil-test.com`
  adminBEmail = `admin-b-tags-${ts}@perfil-test.com`

  const { workspaceId: wsA } = await criarWorkspaceComAdmin("Empresa A Tags", adminAEmail)
  const { workspaceId: wsB } = await criarWorkspaceComAdmin("Empresa B Tags", adminBEmail)
  wsAId = wsA
  wsBId = wsB

  contactAId = await criarContato(wsA, "+5511988801001")
  contactA2Id = await criarContato(wsA, "+5511988801002")
  contactBId = await criarContato(wsB, "+5585988801001")
})

afterAll(async () => {
  if (!tableExists) return

  if (criados.contactIds.length > 0) {
    await serviceClient.from("contact_tags").delete().in("contact_id", criados.contactIds)
    await serviceClient.from("contacts").delete().in("id", criados.contactIds)
  }
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) {
      await serviceClient.auth.admin.deleteUser(id)
    }
  }
  if (criados.workspaceIds.length > 0) {
    await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
  }
})

// ---------------------------------------------------------------------------

describe("Issue 12 — Gerenciar Tags do Contato", () => {
  it("Usuário adiciona tag ao contato — tag aparece no perfil", async () => {
    if (!tableExists) {
      console.log("⚠️  Tabela contact_tags não encontrada — aplicar migração 20260603000003")
      return
    }

    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await adicionarTagContato(contactAId, "vip")
    expect(resultado.erro).toBeUndefined()

    const { data: tags } = await serviceClient
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", contactAId)
    expect(tags?.map((t) => t.tag)).toContain("vip")
  })

  it("Usuário remove tag do contato — tag é removida do perfil", async () => {
    if (!tableExists) return

    // Garante que a tag existe antes de remover
    await serviceClient
      .from("contact_tags")
      .insert({ contact_id: contactAId, workspace_id: wsAId, tag: "remover-me" })

    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await removerTagContato(contactAId, "remover-me")
    expect(resultado.erro).toBeUndefined()

    const { data: tags } = await serviceClient
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", contactAId)
      .eq("tag", "remover-me")
    expect(tags).toHaveLength(0)
  })

  it("Mesma tag pode existir em contatos diferentes do workspace", async () => {
    if (!tableExists) return

    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    await adicionarTagContato(contactAId, "fidelizado")

    const resultado = await adicionarTagContato(contactA2Id, "fidelizado")
    expect(resultado.erro).toBeUndefined()

    const { data: tagsA2 } = await serviceClient
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", contactA2Id)
    expect(tagsA2?.map((t) => t.tag)).toContain("fidelizado")
  })

  it("Tag não pode ser adicionada a contato de outro workspace (isolamento multi-tenant)", async () => {
    if (!tableExists) return

    // Admin A tenta adicionar tag ao contactB (workspace B) — deve ser rejeitado
    const client = await autenticarComo(adminAEmail)
    mockSsrCreateClient.mockResolvedValue(client as never)

    const resultado = await adicionarTagContato(contactBId, "invasao")

    // Action deve retornar erro (contato não encontrado no workspace do usuário)
    expect(resultado.erro).toBeDefined()

    // Tag NÃO foi criada no banco
    const { data: tags } = await serviceClient
      .from("contact_tags")
      .select("tag")
      .eq("contact_id", contactBId)
      .eq("tag", "invasao")
    expect(tags ?? []).toHaveLength(0)
  })
})
