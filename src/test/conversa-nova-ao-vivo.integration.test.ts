// @vitest-environment node
// Conversa criada com a caixa de entrada aberta (primeira mensagem de um
// número). A tela pede a conversa a `buscarConversa`, que precisa aplicar as
// mesmas regras da carga da página. Bate no Supabase real; só o cliente SSR é
// trocado por um cliente autenticado de verdade.

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { buscarConversa } from "@/app/(auth)/chat/actions"

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

async function criarWorkspace(nome: string) {
  const { data: ws, error } = await serviceClient.from("workspaces").insert({ name: nome }).select().single()
  if (!ws) throw new Error(`Falha ao criar workspace ${nome}: ${error?.message ?? "sem dados"}`)
  criados.workspaceIds.push(ws.id)
  return ws.id as string
}

async function criarUsuario(workspaceId: string, email: string, role: "admin" | "atendente") {
  const { data: authData } = await serviceClient.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error(`Falha ao criar auth user ${email}`)

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

async function criarConversaNova(workspaceId: string, assignedTo: string | null) {
  const { data: contact } = await serviceClient
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: `+5511${Date.now()}${Math.floor(Math.random() * 100)}` })
    .select()
    .single()
  if (!contact) throw new Error("Falha ao criar contato")
  criados.contactIds.push(contact.id)

  const { data: conv } = await serviceClient
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contact.id,
      status: "em_espera",
      assigned_to: assignedTo,
      unread_count: 1,
      last_message_text: "Oi",
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (!conv) throw new Error("Falha ao criar conversa")
  criados.conversationIds.push(conv.id)
  return conv.id as string
}

async function autenticarComo(email: string) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  mockSsrCreateClient.mockResolvedValue(client as never)
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

describe("conversa nova chegando com a caixa de entrada aberta", () => {
  const sufixo = Date.now()
  const adminEmail = `admin-conv-nova-${sufixo}@test.com`
  const atendenteEmail = `atendente-conv-nova-${sufixo}@test.com`
  const outroAdminEmail = `outro-admin-conv-nova-${sufixo}@test.com`
  let semDono: string
  let doAtendente: string

  beforeAll(async () => {
    const workspaceId = await criarWorkspace("WS Conversa Nova")
    await criarUsuario(workspaceId, adminEmail, "admin")
    const atendenteId = await criarUsuario(workspaceId, atendenteEmail, "atendente")

    const outroWorkspaceId = await criarWorkspace("WS Outro")
    await criarUsuario(outroWorkspaceId, outroAdminEmail, "admin")

    semDono = await criarConversaNova(workspaceId, null)
    doAtendente = await criarConversaNova(workspaceId, atendenteId)
  })

  it("admin recebe a conversa pronta para a lista, com prévia e não lidas", async () => {
    await autenticarComo(adminEmail)

    const conversa = await buscarConversa(semDono)

    expect(conversa?.id).toBe(semDono)
    expect(conversa?.ultimaMensagem.texto).toBe("Oi")
    expect(conversa?.naoLidas).toBe(1)
    expect(conversa?.status).toBe("em_espera")
  })

  it("conversa de outro workspace não é entregue", async () => {
    await autenticarComo(outroAdminEmail)

    expect(await buscarConversa(semDono)).toBeNull()
  })

  it("atendente não recebe conversa que não é dele", async () => {
    await autenticarComo(atendenteEmail)

    expect(await buscarConversa(semDono)).toBeNull()
  })

  it("atendente recebe a conversa atribuída a ele", async () => {
    await autenticarComo(atendenteEmail)

    expect((await buscarConversa(doAtendente))?.id).toBe(doAtendente)
  })
})
