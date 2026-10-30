// @vitest-environment node
// B23-05 — Mensagem editada ou apagada pelo contato (número em uso no celular).
// Bate no banco de teste: o webhook da Meta é chamado assinado como ela assina, e as
// mensagens são lidas por `buscarMensagens` como o Chat lê (navegador do Admin).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
const dispararAutomacoes = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...args: unknown[]) => dispararAutomacoes(...args) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"
import { buscarMensagens } from "@/app/(auth)/chat/actions"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SEGREDO = "segredo-da-meta-b23-05"
const SENHA = "senha-segura-123"
const sufixo = String(ts).slice(-7)
const ID_DO_NUMERO = `pn_b23_05_${ts}`
const CLIENTE = `55219${sufixo}1`
const WAMID_TEXTO = `wamid.b23-05.texto.${ts}`
const WAMID_APAGAR = `wamid.b23-05.apagar.${ts}`

let empresa = "", conexao = "", contato = "", conversa = "", admin = ""

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B23-05 ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: `55119${sufixo}0`, display_name: "Loja",
    phone_number_id: ID_DO_NUMERO, waba_id: `waba_${ts}`, access_token: "token", em_uso_no_celular: true,
  }).select("id").single()).data!.id
  contato = (await service.from("contacts").insert({ workspace_id: empresa, phone_number: CLIENTE, name: "Cliente" }).select("id").single()).data!.id
  conversa = (await service.from("conversations").insert({
    workspace_id: empresa, contact_id: contato, status: "em_atendimento", whatsapp_connection_id: conexao,
    last_message_text: "Quero 20 caixas", last_message_at: new Date(ts - 60_000).toISOString(),
  }).select("id").single()).data!.id
  await service.from("messages").insert([
    { workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto", content: "Quero 20 caixas", wamid: WAMID_TEXTO, created_at: new Date(ts - 60_000).toISOString() },
    { workspace_id: empresa, conversation_id: conversa, direction: "recebida", type: "texto", content: "Manda o pix", wamid: WAMID_APAGAR, created_at: new Date(ts - 30_000).toISOString() },
  ])
  const email = `b23-05-admin-${ts}@teste.com`
  admin = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: admin, workspace_id: empresa, name: "Admin", role: "admin" })
  clienteDaVez = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
  dispararAutomacoes.mockClear()
})

afterAll(async () => {
  await service.from("messages").delete().eq("conversation_id", conversa)
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("id", admin)
  await service.auth.admin.deleteUser(admin)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

async function receber(mensagem: Record<string, unknown>) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "waba", changes: [{ field: "messages", value: {
      messaging_product: "whatsapp", metadata: { phone_number_id: ID_DO_NUMERO },
      contacts: [{ wa_id: CLIENTE, profile: { name: "Cliente" } }],
      messages: [{ from: CLIENTE, timestamp: String(Math.floor(ts / 1000)), ...mensagem }],
    } }] }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } }))
  expect(res.status).toBe(200)
}

describe("B23-05 — Edição e exclusão pelo contato", { timeout: 60_000 }, () => {
  it("CA-B23-24: should trocar o texto da mensagem original e marcá-la como editada, sem criar mensagem nova", async () => {
    await receber({ id: `wamid.b23-05.edit.${ts}`, type: "edit", edit: { original_message_id: WAMID_TEXTO, message: { type: "text", text: { body: "Quero 25 caixas" } } } })

    const { data: original } = await service.from("messages").select("content, edited_at, deleted_at").eq("wamid", WAMID_TEXTO).single()
    expect(original?.content).toBe("Quero 25 caixas")
    expect(original?.edited_at).not.toBeNull()
    expect(original?.deleted_at).toBeNull()
    const { data: todas } = await service.from("messages").select("id").eq("conversation_id", conversa)
    expect(todas).toHaveLength(2)
    expect(dispararAutomacoes).not.toHaveBeenCalled()

    const naTela = (await buscarMensagens(conversa)).find((m) => m.conteudo === "Quero 25 caixas")
    expect(naTela).toMatchObject({ conteudo: "Quero 25 caixas", editada: true })
    expect(naTela?.apagada).toBeUndefined()
  })

  it("CA-B23-25: should marcar a mensagem como apagada, mantendo-a no banco e sem criar mensagem nova", async () => {
    await receber({ id: `wamid.b23-05.revoke.${ts}`, type: "revoke", revoke: { original_message_id: WAMID_APAGAR } })

    const { data: original } = await service.from("messages").select("content, deleted_at").eq("wamid", WAMID_APAGAR).single()
    expect(original?.deleted_at).not.toBeNull()
    const { data: todas } = await service.from("messages").select("id").eq("conversation_id", conversa)
    expect(todas).toHaveLength(2)
    expect(dispararAutomacoes).not.toHaveBeenCalled()

    const naTela = (await buscarMensagens(conversa)).find((m) => m.apagada)
    expect(naTela).toMatchObject({ apagada: true })
  })
})
