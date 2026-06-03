// @vitest-environment node
// Integration tests — batem no Supabase real.
// Única coisa mockada: @/integrations/supabase/server, para injetar um
// cliente autenticado de verdade no lugar do cliente baseado em cookies do SSR.
//
// NOTA: Estes testes verificam a lógica de classificação via pipeline_cards diretamente,
// pois o banco de testes pode não ter as colunas adicionadas em migrações posteriores
// (tipo, nicho, cidade, icp). A lógica de calcularClassificacao é testada com dados
// reais da tabela pipeline_cards.

import { createClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { calcularClassificacao } from "@/app/(auth)/contatos/actions"

const mockSsrCreateClient = vi.mocked(createSsrClient)
void mockSsrCreateClient

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
  cardIds: [] as string[],
}

let wsId: string
let adminEmail: string

async function autenticarComo(email: string) {
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Falha ao autenticar ${email}: ${error.message}`)
  return client
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

async function criarCard(workspaceId: string, contactId: string, funil: string, etapa: string) {
  const { data } = await serviceClient
    .from("pipeline_cards")
    .insert({ workspace_id: workspaceId, contact_id: contactId, funil, etapa })
    .select("id")
    .single()
  if (!data) throw new Error(`Falha ao criar card ${funil}/${etapa}`)
  criados.cardIds.push(data.id)
  return data.id as string
}

beforeAll(async () => {
  const ts = Date.now()
  adminEmail = `admin-classif-${ts}@contatos-test.com`

  const { data: ws } = await serviceClient
    .from("workspaces")
    .insert({ name: "Empresa Classif" })
    .select()
    .single()
  if (!ws) throw new Error("Falha ao criar workspace")
  wsId = ws.id
  criados.workspaceIds.push(ws.id)

  const { data: authData } = await serviceClient.auth.admin.createUser({
    email: adminEmail,
    password: SENHA,
    email_confirm: true,
  })
  if (!authData.user) throw new Error("Falha ao criar admin")

  await serviceClient.from("profiles").insert({
    id: authData.user.id,
    workspace_id: ws.id,
    name: "Admin Teste",
    role: "admin",
    status: "active",
  })
  criados.userIds.push(authData.user.id)
})

afterAll(async () => {
  if (criados.cardIds.length > 0) {
    await serviceClient.from("pipeline_cards").delete().in("id", criados.cardIds)
  }
  if (criados.contactIds.length > 0) {
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

describe("Issue 11 — Classificação Automática (Integração com Pipeline)", () => {
  it("Contato sem card retorna classificação 'sem_historico'", async () => {
    const client = await autenticarComo(adminEmail)
    const contactId = await criarContato(wsId, "+5511999011001")

    const { data: cards } = await client
      .from("pipeline_cards")
      .select("funil, etapa")
      .eq("contact_id", contactId)

    expect(calcularClassificacao(cards ?? [])).toBe("sem_historico")
  })

  it("Contato com card em Expansão exibe classificação 'lead'", async () => {
    const client = await autenticarComo(adminEmail)
    const contactId = await criarContato(wsId, "+5511999011002")
    await criarCard(wsId, contactId, "expansao", "lead")

    const { data: cards } = await client
      .from("pipeline_cards")
      .select("funil, etapa")
      .eq("contact_id", contactId)

    expect(cards).toHaveLength(1)
    expect(calcularClassificacao(cards ?? [])).toBe("lead")
  })

  it("Contato com card de Expansão e Retenção: classificação derivada da Retenção", async () => {
    const client = await autenticarComo(adminEmail)
    const contactId = await criarContato(wsId, "+5511999011003")
    await criarCard(wsId, contactId, "expansao", "primeira_compra")
    await criarCard(wsId, contactId, "retencao", "em_onboarding")

    const { data: cards } = await client
      .from("pipeline_cards")
      .select("funil, etapa")
      .eq("contact_id", contactId)

    expect(calcularClassificacao(cards ?? [])).toBe("ativo")
  })

  it("Card de Retenção na etapa 'em_risco' resulta em classificação 'em_risco'", async () => {
    const client = await autenticarComo(adminEmail)
    const contactId = await criarContato(wsId, "+5511999011004")
    const cardId = await criarCard(wsId, contactId, "retencao", "cliente_ativo")

    await serviceClient
      .from("pipeline_cards")
      .update({ etapa: "em_risco" })
      .eq("id", cardId)

    const { data: cards } = await client
      .from("pipeline_cards")
      .select("funil, etapa")
      .eq("contact_id", contactId)

    expect(calcularClassificacao(cards ?? [])).toBe("em_risco")
  })

  it("Card de Retenção na etapa 'perdido' resulta em classificação 'perdido'", async () => {
    const client = await autenticarComo(adminEmail)
    const contactId = await criarContato(wsId, "+5511999011005")
    const cardId = await criarCard(wsId, contactId, "retencao", "aguardando_recompra")

    await serviceClient
      .from("pipeline_cards")
      .update({ etapa: "perdido" })
      .eq("id", cardId)

    const { data: cards } = await client
      .from("pipeline_cards")
      .select("funil, etapa")
      .eq("contact_id", contactId)

    expect(calcularClassificacao(cards ?? [])).toBe("perdido")
  })
})
