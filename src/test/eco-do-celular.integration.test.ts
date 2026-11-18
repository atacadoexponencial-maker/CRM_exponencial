// @vitest-environment node
// B23-04 — Mensagens enviadas pelo celular (eco da Meta) aparecem no chat e valem
// como resposta do time. Bate no banco de teste com o webhook da Meta assinado
// (padrão de historico-do-celular.integration.test.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

const dispararAutomacoes = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...args: unknown[]) => dispararAutomacoes(...args) }))
const transmitirMensagem = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: (...args: unknown[]) => transmitirMensagem(...args) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SEGREDO = "segredo-da-meta-b23-04"
const SENHA = "senha-segura-123"
const sufixo = String(ts).slice(-7)
const EMPRESA_DIGITOS = `55119${sufixo}0`
const EMPRESA_FORMATADO = `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}0`
const ID_DO_NUMERO = `pn_b23_04_${ts}`
const CLIENTE = `55219${sufixo}1`
const DESCONHECIDO = `55219${sufixo}2`

let empresa = "", conexao = "", cliente = "", conversaDoCliente = "", atendente = ""
let navegadorDoAtendente: SupabaseClient
const seg = (n: number) => String(Math.floor(ts / 1000) + n)

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B23-04 ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: EMPRESA_DIGITOS, display_name: "Loja",
    phone_number_id: ID_DO_NUMERO, waba_id: `waba_${ts}`, access_token: "token", em_uso_no_celular: true,
  }).select("id").single()).data!.id
  cliente = (await service.from("contacts").insert({ workspace_id: empresa, phone_number: CLIENTE, name: "Cliente" }).select("id").single()).data!.id
  // Conversa aberta, sem atendente, em que a última mensagem é do cliente: está "esperando resposta".
  conversaDoCliente = (await service.from("conversations").insert({
    workspace_id: empresa, contact_id: cliente, status: "em_espera", assigned_to: null, unread_count: 1,
    whatsapp_connection_id: conexao, last_message_text: "Tem estoque?", last_message_at: new Date(ts - 60_000).toISOString(),
  }).select("id").single()).data!.id
  await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversaDoCliente, direction: "recebida", type: "texto", content: "Tem estoque?",
    wamid: `wamid.b23-04.recebida.${ts}`, created_at: new Date(ts - 60_000).toISOString(),
  })
  // Um Admin, para ler "Esperando resposta" como o Dashboard lê (a função roda com a permissão de quem chama).
  const email = `b23-04-admin-${ts}@teste.com`
  atendente = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await service.from("profiles").insert({ id: atendente, workspace_id: empresa, name: "Admin", role: "admin" })
  navegadorDoAtendente = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await navegadorDoAtendente.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
  dispararAutomacoes.mockClear()
  transmitirMensagem.mockClear()
})

afterAll(async () => {
  const { data: conversas } = await service.from("conversations").select("id").eq("workspace_id", empresa)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("whatsapp_connections").delete().eq("workspace_id", empresa)
  await service.from("profiles").delete().eq("id", atendente)
  await service.auth.admin.deleteUser(atendente)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

async function receberEco(ecos: Record<string, unknown>[]) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "waba", changes: [{ field: "smb_message_echoes", value: {
      messaging_product: "whatsapp", metadata: { display_phone_number: EMPRESA_FORMATADO, phone_number_id: ID_DO_NUMERO }, message_echoes: ecos,
    } }] }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } }))
  expect(res.status).toBe(200)
}

const eco = (to: string, id: string, body: string, n = 10) => ({
  from: EMPRESA_DIGITOS, to, id, timestamp: seg(n), type: "text", text: { body },
})

async function esperandoResposta() {
  const { data } = await navegadorDoAtendente.rpc("conversas_esperando_resposta", { p_limite: 50 })
  return ((data ?? []) as Array<{ conversa_id: string }>).map((c) => c.conversa_id)
}

describe("B23-04 — Eco do celular no chat", { timeout: 60_000 }, () => {
  it("CA-B23-22: should tirar a conversa de 'Esperando resposta' e disparar 'mensagem enviada pelo time' como o envio pelo chat", async () => {
    expect(await esperandoResposta()).toContain(conversaDoCliente)

    await receberEco([eco(CLIENTE, `wamid.b23-04.eco1.${ts}`, "Tem sim, mando hoje")])

    expect(await esperandoResposta()).not.toContain(conversaDoCliente)
    expect(dispararAutomacoes).toHaveBeenCalledTimes(1)
    expect(dispararAutomacoes.mock.calls[0][0]).toMatchObject({ tipo: "mensagem_enviada_time", workspaceId: empresa, contactId: cliente, conversationId: conversaDoCliente, texto: "Tem sim, mando hoje" })
  })

  it("CA-B23-19: should gravar o eco como enviada pela empresa, marcada do celular, sem atendente, e não duplicar na reentrega", async () => {
    const wamid = `wamid.b23-04.eco3.${ts}`
    await receberEco([eco(CLIENTE, wamid, "Segue a tabela", 15)])

    const { data: mensagem } = await service.from("messages")
      .select("direction, type, content, status, sent_from_phone, conversation_id")
      .eq("wamid", wamid).single()
    expect(mensagem).toEqual({ direction: "enviada", type: "texto", content: "Segue a tabela", status: "enviado", sent_from_phone: true, conversation_id: conversaDoCliente })
    const { data: conversa } = await service.from("conversations").select("assigned_to, unread_count, last_message_text").eq("id", conversaDoCliente).single()
    expect(conversa).toEqual({ assigned_to: null, unread_count: 1, last_message_text: "Segue a tabela" })
    // Foi para a tela pelo mesmo caminho em tempo real, com a marca.
    expect(transmitirMensagem).toHaveBeenCalledTimes(1)
    expect(transmitirMensagem.mock.calls[0][0]).toMatchObject({ direction: "enviada", sent_from_phone: true, content: "Segue a tabela" })

    // Reentrega do mesmo eco: uma cópia só, nada transmitido de novo.
    transmitirMensagem.mockClear()
    await receberEco([eco(CLIENTE, wamid, "Segue a tabela", 15)])
    const { data: copias } = await service.from("messages").select("id").eq("wamid", wamid)
    expect(copias).toHaveLength(1)
    expect(transmitirMensagem).not.toHaveBeenCalled()
  })

  it("CA-B23-21: should criar contato e conversa para telefone desconhecido, com a mensagem dentro", async () => {
    await receberEco([eco(DESCONHECIDO, `wamid.b23-04.eco2.${ts}`, "Oi, aqui é da loja", 20)])

    const { data: contato } = await service.from("contacts").select("id, name").eq("workspace_id", empresa).eq("phone_number", DESCONHECIDO).single()
    expect(contato).toBeTruthy()
    const { data: conversas } = await service.from("conversations").select("id, status, unread_count, whatsapp_connection_id, last_message_text").eq("contact_id", contato!.id)
    expect(conversas).toHaveLength(1)
    expect(conversas![0]).toMatchObject({ status: "em_espera", unread_count: 0, whatsapp_connection_id: conexao, last_message_text: "Oi, aqui é da loja" })
    const { data: mensagens } = await service.from("messages").select("direction, content, sent_from_phone").eq("conversation_id", conversas![0].id)
    expect(mensagens).toEqual([{ direction: "enviada", content: "Oi, aqui é da loja", sent_from_phone: true }])
  })
})
