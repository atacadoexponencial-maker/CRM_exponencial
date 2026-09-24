// @vitest-environment node
// Número removido e conectado de novo (24/09/2026, teste com chip real):
// a conversa antiga precisa passar para a conexão nova, e o envio que falha
// precisa dizer por quê. Bate no Supabase real; o cliente SSR vira um cliente
// autenticado, e o envio ao canal é falso — nenhuma chamada ao gateway.

import { createClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/integrations/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(async () => ({
    enviarTexto: async () => ({ ok: false, motivo: "Credencial ausente ou inválida." }),
  })),
}))

import { createClient as createSsrClient } from "@/integrations/supabase/server"
import { enviarMensagem } from "@/app/(auth)/chat/actions"
import { aplicarEstadoDaInstancia } from "@/lib/whatsapp/eventos-de-operacao"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SENHA = "senha-test-123!"
const TELEFONE = "5521900000000"

const service = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const criados = {
  workspaceIds: [] as string[],
  userIds: [] as string[],
  conexaoIds: [] as string[],
  contatoIds: [] as string[],
  conversaIds: [] as string[],
}

async function criarWorkspace(nome: string) {
  const { data } = await service.from("workspaces").insert({ name: nome }).select().single()
  if (!data) throw new Error("Falha ao criar workspace")
  criados.workspaceIds.push(data.id)
  return data.id as string
}

async function criarConexao(workspaceId: string, status: string) {
  const { data, error } = await service
    .from("whatsapp_connections")
    .insert({
      workspace_id: workspaceId,
      canal: "gateway",
      status,
      phone_number: TELEFONE,
      instance_id: `inst_teste_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
      instance_token: "token-de-teste",
    })
    .select()
    .single()
  if (!data) throw new Error(`Falha ao criar conexão: ${error?.message}`)
  criados.conexaoIds.push(data.id)
  return data.id as string
}

async function criarConversa(workspaceId: string, conexaoId: string) {
  const { data: contato } = await service
    .from("contacts")
    .insert({ workspace_id: workspaceId, phone_number: `+5511${Date.now()}${Math.floor(Math.random() * 100)}` })
    .select()
    .single()
  if (!contato) throw new Error("Falha ao criar contato")
  criados.contatoIds.push(contato.id)

  const { data } = await service
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contato.id,
      status: "em_espera",
      unread_count: 0,
      last_message_text: "Oi",
      last_message_at: new Date().toISOString(),
      whatsapp_connection_id: conexaoId,
    })
    .select()
    .single()
  if (!data) throw new Error("Falha ao criar conversa")
  criados.conversaIds.push(data.id)
  return data.id as string
}

async function conexaoDaConversa(conversaId: string) {
  const { data } = await service
    .from("conversations")
    .select("whatsapp_connection_id")
    .eq("id", conversaId)
    .single()
  return data?.whatsapp_connection_id
}

afterAll(async () => {
  if (criados.conversaIds.length) await service.from("conversations").delete().in("id", criados.conversaIds)
  if (criados.contatoIds.length) await service.from("contacts").delete().in("id", criados.contatoIds)
  if (criados.conexaoIds.length) await service.from("whatsapp_connections").delete().in("id", criados.conexaoIds)
  if (criados.userIds.length) {
    await service.from("profiles").delete().in("id", criados.userIds)
    for (const id of criados.userIds) await service.auth.admin.deleteUser(id)
  }
  if (criados.workspaceIds.length) await service.from("workspaces").delete().in("id", criados.workspaceIds)
})

describe("número removido e conectado de novo", () => {
  let conversaAntiga: string
  let conversaDeOutraEmpresa: string
  let conexaoNova: string
  let conexaoRemovidaDeOutraEmpresa: string

  beforeAll(async () => {
    const workspaceId = await criarWorkspace("WS Reconexão")
    const removida = await criarConexao(workspaceId, "removed")
    conversaAntiga = await criarConversa(workspaceId, removida)
    conexaoNova = await criarConexao(workspaceId, "pairing")

    const outroWorkspace = await criarWorkspace("WS Outra Empresa")
    conexaoRemovidaDeOutraEmpresa = await criarConexao(outroWorkspace, "removed")
    conversaDeOutraEmpresa = await criarConversa(outroWorkspace, conexaoRemovidaDeOutraEmpresa)

    await aplicarEstadoDaInstancia({
      supabase: service as never,
      connectionId: conexaoNova,
      evento: { state: "connected", phone_number: TELEFONE },
    })
  })

  it("a conversa da conexão removida passa para a conexão nova do mesmo telefone", async () => {
    expect(await conexaoDaConversa(conversaAntiga)).toBe(conexaoNova)
  })

  it("conversa de outra empresa com o mesmo telefone não é tocada", async () => {
    expect(await conexaoDaConversa(conversaDeOutraEmpresa)).toBe(conexaoRemovidaDeOutraEmpresa)
  })
})

describe("envio que falha diz por quê", () => {
  let conversaDeNumeroRemovido: string
  let conversaDeNumeroDesconectado: string

  beforeAll(async () => {
    const workspaceId = await criarWorkspace("WS Motivo do Envio")
    const email = `admin-motivo-envio-${Date.now()}@test.com`
    const { data: auth } = await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })
    if (!auth.user) throw new Error("Falha ao criar usuário")
    criados.userIds.push(auth.user.id)
    await service.from("profiles").insert({
      id: auth.user.id,
      workspace_id: workspaceId,
      name: "Admin",
      role: "admin",
      status: "active",
    })

    conversaDeNumeroRemovido = await criarConversa(workspaceId, await criarConexao(workspaceId, "removed"))
    conversaDeNumeroDesconectado = await criarConversa(workspaceId, await criarConexao(workspaceId, "disconnected"))

    const cliente = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA })
    if (error) throw new Error(`Falha ao autenticar: ${error.message}`)
    vi.mocked(createSsrClient).mockResolvedValue(cliente as never)
  })

  it("número removido: devolve o motivo e o que fazer, sem exceção", async () => {
    const resultado = await enviarMensagem(conversaDeNumeroRemovido, "Olá")

    expect(resultado.erro).toMatch(/^Não enviada: o número desta conversa foi removido/)
    expect(resultado.erro).toMatch(/Configurações → WhatsApp/)
  })

  it("número desconectado: devolve o motivo e o que fazer", async () => {
    const resultado = await enviarMensagem(conversaDeNumeroDesconectado, "Olá")

    expect(resultado.erro).toMatch(/^Não enviada: o número desta conversa está desconectado/)
  })
})
