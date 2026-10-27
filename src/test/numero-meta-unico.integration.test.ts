// @vitest-environment node
// B44-01 — um número da Meta pertence a uma empresa só (auditoria de 27/10/2026).
// Bate no Supabase real: o client SSR é trocado pelo "navegador" do Admin da vez e o
// webhook roda com a chave de serviço de verdade. A Meta é um fetch espião.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// O webhook dispara automações, transmite ao vivo e busca a foto: nada disso é o que se testa.
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { completarConexaoWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/actions"
import { POST } from "@/app/api/webhooks/whatsapp/route"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
const SEGREDO_DE_TESTE = "segredo-da-meta-b44-01"
const ID_DO_NUMERO = `pn_b44_${ts}`
const TELEFONE_CLIENTE = `55119${String(ts).slice(-8)}`
let empresaA = "", empresaB = "", conexaoA = ""
const usuarios: string[] = []
let adminB: SupabaseClient

async function criarAdmin(empresa: string, nome: string) {
  const email = `b44-01-${nome}-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresa, name: nome, role: "admin" })
  const navegador = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegador.auth.signInWithPassword({ email, password: SENHA })
  return navegador
}

beforeAll(async () => {
  empresaA = (await service.from("workspaces").insert({ name: `[TESTE] B44-01 A ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B44-01 B ${ts}` }).select("id").single()).data!.id
  conexaoA = (await service.from("whatsapp_connections").insert({
    workspace_id: empresaA, canal: "meta", status: "connected", phone_number: "5511933330000",
    display_name: "Loja A", phone_number_id: ID_DO_NUMERO, waba_id: `waba_${ts}`, access_token: "token-de-a",
  }).select("id").single()).data!.id
  adminB = await criarAdmin(empresaB, "admin-b")
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

afterAll(async () => {
  const { data: conversas } = await service.from("conversations").select("id").in("workspace_id", [empresaA, empresaB])
  const idsConversas = (conversas ?? []).map((c) => c.id)
  if (idsConversas.length) await service.from("messages").delete().in("conversation_id", idsConversas)
  await service.from("conversations").delete().in("workspace_id", [empresaA, empresaB])
  await service.from("contacts").delete().in("workspace_id", [empresaA, empresaB])
  await service.from("whatsapp_connections").delete().in("workspace_id", [empresaA, empresaB])
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", [empresaA, empresaB])
}, 60_000)

async function conexaoDeA() {
  return (await service.from("whatsapp_connections")
    .select("workspace_id, phone_number_id, access_token, status").eq("id", conexaoA).single()).data
}

describe("B44-01 — Número da Meta pertence a uma empresa só", { timeout: 30_000 }, () => {
  it("CA-B44-01: should recusar o número que já está em outra empresa, sem falar com a Meta", async () => {
    // Só as chamadas à Meta são espionadas; as do Supabase seguem para o banco de verdade.
    const fetchDeVerdade = globalThis.fetch
    const meta = vi.fn()
    vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("graph.facebook.com")) return meta(url, init)
      return fetchDeVerdade(url, init)
    })
    clienteDaVez = adminB

    const resultado = await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: ID_DO_NUMERO, wabaId: `waba_b_${ts}` })

    expect(resultado).toEqual({ erro: "Este número já está conectado em outra empresa." })
    expect(meta).not.toHaveBeenCalled()
    const { data: deB } = await service.from("whatsapp_connections").select("id").eq("workspace_id", empresaB)
    expect(deB).toEqual([])
    expect(await conexaoDeA()).toEqual({ workspace_id: empresaA, phone_number_id: ID_DO_NUMERO, access_token: "token-de-a", status: "connected" })
  })

  it("CA-B44-02: should recusar criar conexão direto pela API do banco, mesmo com o número de A", async () => {
    const { error } = await adminB.from("whatsapp_connections").insert({
      workspace_id: empresaB, canal: "meta", status: "connected", phone_number: "5511944440000",
      phone_number_id: ID_DO_NUMERO, waba_id: `waba_b_${ts}`, access_token: "token-de-b",
    })

    expect(error).not.toBeNull()
    const { data: deB } = await service.from("whatsapp_connections").select("id").eq("workspace_id", empresaB)
    expect(deB).toEqual([])
  })

  it("CA-B44-02: should recusar alterar conexão direto pela API do banco (trocar token ou número)", async () => {
    const { data: criada } = await service.from("whatsapp_connections").insert({
      workspace_id: empresaB, canal: "meta", status: "connected", phone_number: "5511955550000",
      phone_number_id: `pn_b44_b_${ts}`, waba_id: `waba_b_${ts}`, access_token: "token-de-b",
    }).select("id").single()

    const { error: e1 } = await adminB.from("whatsapp_connections").update({ access_token: "token-trocado" }).eq("id", criada!.id)
    const { error: e2 } = await adminB.from("whatsapp_connections").update({ phone_number_id: ID_DO_NUMERO }).eq("id", criada!.id)

    expect(e1).not.toBeNull()
    expect(e2).not.toBeNull()
    const { data: depois } = await service.from("whatsapp_connections").select("access_token, phone_number_id").eq("id", criada!.id).single()
    expect(depois).toEqual({ access_token: "token-de-b", phone_number_id: `pn_b44_b_${ts}` })
    expect(await conexaoDeA()).toEqual({ workspace_id: empresaA, phone_number_id: ID_DO_NUMERO, access_token: "token-de-a", status: "connected" })
    await service.from("whatsapp_connections").delete().eq("id", criada!.id)
  })

  it("CA-B44-03: should levar a mensagem da Meta só para a empresa dona do número", async () => {
    vi.stubEnv("META_APP_SECRET", SEGREDO_DE_TESTE)
    const wamid = `wamid.b44.${ts}`
    const corpo = JSON.stringify({
      entry: [{ changes: [{ value: {
        metadata: { phone_number_id: ID_DO_NUMERO },
        contacts: [{ wa_id: TELEFONE_CLIENTE, profile: { name: "Cliente B44" } }],
        messages: [{ id: wamid, from: TELEFONE_CLIENTE, timestamp: String(Math.floor(ts / 1000)), type: "text", text: { body: "Oi, loja A" } }],
      } }] }],
    })
    const assinatura = "sha256=" + createHmac("sha256", SEGREDO_DE_TESTE).update(corpo).digest("hex")

    const resposta = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", {
      method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura },
    }))

    expect(resposta.status).toBe(200)
    const { data: mensagem } = await service.from("messages").select("content, conversation_id").eq("wamid", wamid).single()
    expect(mensagem?.content).toBe("Oi, loja A")
    const { data: conversa } = await service.from("conversations").select("workspace_id").eq("id", mensagem!.conversation_id).single()
    expect(conversa?.workspace_id).toBe(empresaA)
    const { data: deB } = await service.from("conversations").select("id").eq("workspace_id", empresaB)
    expect(deB).toEqual([])
  })
})
