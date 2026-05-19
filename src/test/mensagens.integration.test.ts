// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/integrations/supabase/service", () => ({
  createServiceClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { marcarComoLidas } from "@/app/(auth)/chat/actions"
import { NextRequest } from "next/server"
import { POST } from "@/app/api/webhooks/whatsapp/route"

const mockCreateServiceClient = vi.mocked(createServiceClient)

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
  conversationIds: [] as string[],
  contactIds: [] as string[],
}

async function criarWorkspaceComAdmin(nome: string, email: string) {
  const { data: ws, error: wsErr } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}: ${wsErr?.message ?? "sem dados"}`)

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

async function criarConversa(workspaceId: string, unreadCount: number) {
  const { data: contact } = await serviceClient
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: `+5511${Date.now()}` })
    .select()
    .single()
  if (!contact) throw new Error("Falha ao criar contato")

  const { data: conv } = await serviceClient
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      status: "em_espera",
      unread_count: unreadCount,
      last_message_text: "teste",
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (!conv) throw new Error("Falha ao criar conversa")

  criados.contactIds.push(contact.id)
  criados.conversationIds.push(conv.id)
  return conv.id
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
  if (criados.conversationIds.length > 0)
    await serviceClient.from("conversations").delete().in("id", criados.conversationIds)
  if (criados.contactIds.length > 0)
    await serviceClient.from("contacts").delete().in("id", criados.contactIds)
  if (criados.userIds.length > 0) {
    await serviceClient.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await serviceClient.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length > 0)
    await serviceClient.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("Issue 27 — Marcar mensagens como lidas", () => {
  let workspaceId: string
  let adminEmail: string
  let convId: string
  let outraConvId: string

  beforeAll(async () => {
    adminEmail = `admin-lidas-${Date.now()}@test.com`
    const ws = await criarWorkspaceComAdmin("WS Lidas", adminEmail)
    workspaceId = ws.workspaceId

    convId = await criarConversa(workspaceId, 5)
    outraConvId = await criarConversa(workspaceId, 3)
  })

  it("abrir conversa zera a contagem de não lidas", async () => {
    const autenticado = await autenticarComo(adminEmail)
    mockSsrCreateClient.mockResolvedValue(autenticado as never)

    await marcarComoLidas(convId)

    const { data } = await serviceClient
      .from("conversations")
      .select("unread_count")
      .eq("id", convId)
      .single()

    expect(data?.unread_count).toBe(0)
  })

  it("não afeta a contagem de não lidas de outras conversas", async () => {
    const { data } = await serviceClient
      .from("conversations")
      .select("unread_count")
      .eq("id", outraConvId)
      .single()

    expect(data?.unread_count).toBe(3)
  })
})

function buildStatusPayload(phoneNumberId: string, wamid: string, status: string) {
  return new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: phoneNumberId },
            statuses: [{ id: wamid, status, timestamp: "1746057600", recipient_id: "5511999999999" }],
          },
          field: "messages",
        }],
      }],
    }),
    headers: { "Content-Type": "application/json" },
  })
}

describe("Issue 28 — Status de entrega", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("status atualiza de 'enviado' para 'entregue' ao receber webhook", async () => {
    const updateMessages = vi.fn().mockReturnThis()
    const eqMessages = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: updateMessages,
        eq: eqMessages,
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    const res = await POST(buildStatusPayload("phone-123", "wamid-abc", "delivered"))

    expect(res.status).toBe(200)
    expect(updateMessages).toHaveBeenCalledWith({ status: "entregue" })
    expect(eqMessages).toHaveBeenCalledWith("wamid", "wamid-abc")
  })

  it("status atualiza de 'entregue' para 'lido' ao receber webhook", async () => {
    const updateMessages = vi.fn().mockReturnThis()
    const eqMessages = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: updateMessages,
        eq: eqMessages,
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    const res = await POST(buildStatusPayload("phone-123", "wamid-abc", "read"))

    expect(res.status).toBe(200)
    expect(updateMessages).toHaveBeenCalledWith({ status: "lido" })
    expect(eqMessages).toHaveBeenCalledWith("wamid", "wamid-abc")
  })

  it("status muda para 'falhou' em caso de erro na entrega", async () => {
    const updateMessages = vi.fn().mockReturnThis()
    const eqMessages = vi.fn().mockResolvedValue({ error: null })

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        update: updateMessages,
        eq: eqMessages,
      }),
    } as unknown as ReturnType<typeof createServiceClient>)

    const res = await POST(buildStatusPayload("phone-123", "wamid-abc", "failed"))

    expect(res.status).toBe(200)
    expect(updateMessages).toHaveBeenCalledWith({ status: "falhou" })
    expect(eqMessages).toHaveBeenCalledWith("wamid", "wamid-abc")
  })
})
