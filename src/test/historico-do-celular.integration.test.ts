// @vitest-environment node
// B23-02 — Importar as conversas antigas do celular para o chat.
// Bate no banco de teste: o webhook da Meta é chamado assinado como ela assina
// (padrão de webhook-whatsapp-status.integration.test.ts) e a action de conexão roda
// com a Meta como fetch espião (padrão de coexistencia-conectar.integration.test.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// O webhook dispara automações, transmite ao vivo e busca a foto: nada disso é o que se testa.
const dispararAutomacoes = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: (...args: unknown[]) => dispararAutomacoes(...args) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("guardada") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"
import { completarConexaoWhatsApp } from "@/app/(auth)/configuracoes/whatsapp/actions"
import { MARCADOR_DE_MIDIA_ANTIGA, TIPO_MIDIA_ANTIGA, textoDaImportacao } from "@/lib/whatsapp/historico-do-celular"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SEGREDO = "segredo-da-meta-b23-02"
const SENHA = "senha-segura-123"
const sufixo = String(ts).slice(-7)

// Número da empresa, em dígitos e como a Meta o escreve no webhook.
const EMPRESA_DIGITOS = `55119${sufixo}0`
const EMPRESA_FORMATADO = `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}0`
const ID_DO_NUMERO = `pn_b23_02_${ts}`
const ID_DO_NUMERO_B = `pn_b23_02_b_${ts}`
const MARIA = `55219${sufixo}1` // já existe no CRM
const PEDRO = `55219${sufixo}2` // só na agenda e no histórico
const SEM_CONVERSA = `55219${sufixo}3` // só na agenda
const GRUPO = `1203630${sufixo}9@g.us`

let empresa = "", empresaB = "", empresaC = "", conexao = "", conexaoB = "", maria = "", conversaDaMaria = ""
const usuarios: string[] = []
let adminC: SupabaseClient

const seg = (n: number) => String(1_700_000_000 + n)

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B23-02 ${ts}` }).select("id").single()).data!.id
  empresaB = (await service.from("workspaces").insert({ name: `[TESTE] B23-02 B ${ts}` }).select("id").single()).data!.id
  empresaC = (await service.from("workspaces").insert({ name: `[TESTE] B23-02 C ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: EMPRESA_DIGITOS, display_name: "Loja",
    phone_number_id: ID_DO_NUMERO, waba_id: `waba_${ts}`, access_token: "token", em_uso_no_celular: true,
    historico_situacao: "importando", historico_progresso: 0, historico_pedido_em: new Date().toISOString(),
  }).select("id").single()).data!.id
  conexaoB = (await service.from("whatsapp_connections").insert({
    workspace_id: empresaB, canal: "meta", status: "connected", phone_number: `55119${sufixo}5`, display_name: "Loja B",
    phone_number_id: ID_DO_NUMERO_B, waba_id: `waba_b_${ts}`, access_token: "token", em_uso_no_celular: true,
    historico_situacao: "importando", historico_progresso: 0, historico_pedido_em: new Date().toISOString(),
  }).select("id").single()).data!.id
  maria = (await service.from("contacts").insert({ workspace_id: empresa, phone_number: MARIA, name: "Maria Existente" }).select("id").single()).data!.id
  conversaDaMaria = (await service.from("conversations").insert({
    workspace_id: empresa, contact_id: maria, status: "em_atendimento", whatsapp_connection_id: conexao,
    last_message_text: "Conversa de hoje", last_message_at: new Date().toISOString(),
  }).select("id").single()).data!.id

  const email = `b23-02-admin-${ts}@teste.com`
  const id = (await service.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  usuarios.push(id)
  await service.from("profiles").insert({ id, workspace_id: empresaC, name: "Admin C", role: "admin" })
  adminC = createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  await adminC.auth.signInWithPassword({ email, password: SENHA })
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  dispararAutomacoes.mockClear()
})

afterAll(async () => {
  const empresas = [empresa, empresaB, empresaC]
  const { data: conversas } = await service.from("conversations").select("id").in("workspace_id", empresas)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().in("workspace_id", empresas)
  await service.from("pipeline_cards").delete().in("workspace_id", empresas)
  await service.from("contacts").delete().in("workspace_id", empresas)
  await service.from("agenda_do_celular").delete().in("workspace_id", empresas)
  await service.from("whatsapp_connections").delete().in("workspace_id", empresas)
  for (const id of usuarios) {
    await service.from("profiles").delete().eq("id", id)
    await service.auth.admin.deleteUser(id)
  }
  await service.from("workspaces").delete().in("id", empresas)
}, 60_000)

/** Chama o webhook como a Meta chama: uma change, com o `field` e o `value` dados. */
async function receber(field: string, value: Record<string, unknown>, phoneNumberId = ID_DO_NUMERO) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{ id: "waba", changes: [{ field, value: { messaging_product: "whatsapp", metadata: { display_phone_number: EMPRESA_FORMATADO, phone_number_id: phoneNumberId }, ...value } }] }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  return POST(new NextRequest("http://localhost/api/webhooks/whatsapp", { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura } }))
}

const texto = (from: string, id: string, n: number, body: string, status = "READ") => ({
  from, id, timestamp: seg(n), type: "text", text: { body }, history_context: { status },
})

const parte1 = {
  metadata: { phase: 0, chunk_order: 1, progress: 30 },
  threads: [
    { id: PEDRO, messages: [
      texto(PEDRO, `wamid.b23.m1.${ts}`, 1000, "Oi, tem estoque?"),
      { from: EMPRESA_DIGITOS, id: `wamid.b23.m2.${ts}`, timestamp: seg(2000), type: "media_placeholder", history_context: { status: "DELIVERED" } },
    ] },
    { id: MARIA, messages: [texto(MARIA, `wamid.b23.m5.${ts}`, 5000, "Oi Maria aqui")] },
    { id: GRUPO, messages: [texto(PEDRO, `wamid.b23.g1.${ts}`, 1500, "Mensagem de grupo")] },
  ],
}
const parte2 = {
  metadata: { phase: 0, chunk_order: 2, progress: 60 },
  threads: [
    { id: PEDRO, messages: [
      texto(PEDRO, `wamid.b23.m3.${ts}`, 3000, "Quero 10 caixas"),
      texto(EMPRESA_DIGITOS, `wamid.b23.m4.${ts}`, 4000, "Fechado, mando hoje", "READ"),
    ] },
  ],
}

async function conversaDoPedro() {
  const { data: contato } = await service.from("contacts").select("id, name").eq("workspace_id", empresa).eq("phone_number", PEDRO).maybeSingle()
  if (!contato) return { contato: null, conversas: [], mensagens: [] }
  const { data: conversas } = await service.from("conversations").select("id, status, unread_count, assigned_to, whatsapp_connection_id, last_message_text, last_message_at").eq("contact_id", contato.id)
  const ids = (conversas ?? []).map((c) => c.id)
  const { data: mensagens } = await service.from("messages")
    .select("wamid, direction, type, content, status, sent_from_phone, created_at")
    .in("conversation_id", ids).order("created_at", { ascending: true })
  return { contato, conversas: conversas ?? [], mensagens: mensagens ?? [] }
}

async function situacao(id: string) {
  const { data } = await service.from("whatsapp_connections").select("status, historico_situacao, historico_progresso").eq("id", id).single()
  return data!
}

describe("B23-02 — Conversas antigas do celular", { timeout: 60_000 }, () => {
  it("CA-B23-13: should guardar a agenda sem criar contato; só quem tiver conversa vira contato", async () => {
    const res = await receber("smb_app_state_sync", {
      state_sync: [
        { type: "contact", action: "add", contact: { full_name: "Maria da Agenda", first_name: "Maria", phone_number: MARIA }, metadata: { timestamp: seg(1) } },
        { type: "contact", action: "add", contact: { full_name: "Pedro da Agenda", first_name: "Pedro", phone_number: PEDRO }, metadata: { timestamp: seg(1) } },
        { type: "contact", action: "add", contact: { full_name: "Ninguém", first_name: "Ninguém", phone_number: SEM_CONVERSA }, metadata: { timestamp: seg(1) } },
      ],
    })
    expect(res.status).toBe(200)

    const { data: contatos } = await service.from("contacts").select("phone_number, name").eq("workspace_id", empresa)
    // Só a Maria, que já existia: agenda sozinha não cria contato.
    expect(contatos).toEqual([{ phone_number: MARIA, name: "Maria Existente" }])
  })

  it("CA-B23-07: should montar a conversa em ordem de data com partes entregues fora de ordem, recebidas de um lado e enviadas do outro", async () => {
    // A parte 2 chega antes da parte 1.
    expect((await receber("history", { history: [parte2] })).status).toBe(200)
    expect((await receber("history", { history: [parte1] })).status).toBe(200)

    const { contato, conversas, mensagens } = await conversaDoPedro()
    expect(contato?.name).toBe("Pedro da Agenda")
    expect(conversas).toHaveLength(1)
    expect(mensagens.map((m) => [m.wamid, m.direction])).toEqual([
      [`wamid.b23.m1.${ts}`, "recebida"],
      [`wamid.b23.m2.${ts}`, "enviada"],
      [`wamid.b23.m3.${ts}`, "recebida"],
      [`wamid.b23.m4.${ts}`, "enviada"],
    ])
    // SUP-B23-13: a enviada pelo celular leva a marca e o status da Meta.
    expect(mensagens[3]).toMatchObject({ content: "Fechado, mando hoje", sent_from_phone: true, status: "lido" })
    expect(mensagens[0]).toMatchObject({ content: "Oi, tem estoque?", sent_from_phone: false, status: null })
    // SUP-B23-14: conversa antiga nasce em espera, sem não lidas, com a prévia da mais nova.
    expect(conversas[0]).toMatchObject({ status: "em_espera", unread_count: 0, assigned_to: null, whatsapp_connection_id: conexao, last_message_text: "Fechado, mando hoje" })
    // Conversa antiga não dispara automação (o resto é da B23-03).
    expect(dispararAutomacoes).not.toHaveBeenCalled()
    expect((await situacao(conexao))).toMatchObject({ historico_situacao: "importando", historico_progresso: 60 })
  })

  it("CA-B23-08: should manter uma cópia só de cada mensagem quando a mesma parte chega de novo", async () => {
    const antes = await conversaDoPedro()
    expect((await receber("history", { history: [parte1] })).status).toBe(200)
    const depois = await conversaDoPedro()
    expect(depois.mensagens.map((m) => m.wamid)).toEqual(antes.mensagens.map((m) => m.wamid))
    expect(depois.conversas).toHaveLength(1)
    const { data: daMaria } = await service.from("messages").select("wamid").eq("conversation_id", conversaDaMaria)
    expect(daMaria).toEqual([{ wamid: `wamid.b23.m5.${ts}` }])
  })

  it("CA-B23-11: should mostrar o marcador de mídia antiga no lugar da mídia não entregue, com data e remetente certos", async () => {
    const { mensagens } = await conversaDoPedro()
    const marcador = mensagens.find((m) => m.wamid === `wamid.b23.m2.${ts}`)
    expect(marcador).toMatchObject({ type: TIPO_MIDIA_ANTIGA, content: MARCADOR_DE_MIDIA_ANTIGA, direction: "enviada", sent_from_phone: true })
    expect(new Date(marcador!.created_at).getTime()).toBe(Number(seg(2000)) * 1000)
  })

  it("CA-B23-12: should not criar conversa de grupo", async () => {
    const { data: contatos } = await service.from("contacts").select("phone_number").eq("workspace_id", empresa)
    expect(contatos!.map((c) => c.phone_number).sort()).toEqual([MARIA, PEDRO].sort())
    const { data: deGrupo } = await service.from("messages").select("id").eq("wamid", `wamid.b23.g1.${ts}`)
    expect(deGrupo).toEqual([])
  })

  it("CA-B23-14: should pôr as mensagens antigas no contato que já existia, sem duplicar nem renomear", async () => {
    const { data: contatos } = await service.from("contacts").select("id, name").eq("workspace_id", empresa).eq("phone_number", MARIA)
    expect(contatos).toEqual([{ id: maria, name: "Maria Existente" }])
    const { data: conversas } = await service.from("conversations").select("id, last_message_text").eq("contact_id", maria)
    expect(conversas).toEqual([{ id: conversaDaMaria, last_message_text: "Conversa de hoje" }])
    const { data: mensagem } = await service.from("messages").select("content, direction").eq("wamid", `wamid.b23.m5.${ts}`).single()
    expect(mensagem).toEqual({ content: "Oi Maria aqui", direction: "recebida" })
  })

  it('CA-B23-09: should chegar a "importadas" quando a Meta avisa 100%', async () => {
    expect((await receber("history", { history: [{ metadata: { phase: 2, chunk_order: 3, progress: 100 }, threads: [] }] })).status).toBe(200)
    const { status, historico_situacao, historico_progresso } = await situacao(conexao)
    expect({ status, historico_situacao, historico_progresso }).toEqual({ status: "connected", historico_situacao: "importado", historico_progresso: 100 })
    expect(textoDaImportacao(historico_situacao, historico_progresso)).toBe("Conversas antigas importadas")
  })

  it("CA-B23-10: should registrar a recusa do dono do número e seguir conectado, recebendo mensagens novas", async () => {
    const recusa = { history: [{ errors: [{ code: 2593109, title: "History sync is turned off by the business from the WhatsApp Business App", message: "History sync is turned off by the business from the WhatsApp Business App" }] }] }
    expect((await receber("history", recusa, ID_DO_NUMERO_B)).status).toBe(200)
    const { status, historico_situacao, historico_progresso } = await situacao(conexaoB)
    expect({ status, historico_situacao }).toEqual({ status: "connected", historico_situacao: "recusado" })
    expect(textoDaImportacao(historico_situacao, historico_progresso)).toBe("Você não autorizou o envio das conversas antigas")

    // Mensagem nova entra pelo caminho normal.
    const wamid = `wamid.b23.nova.${ts}`
    const res = await receber("messages", {
      contacts: [{ wa_id: PEDRO, profile: { name: "Pedro" } }],
      messages: [{ from: PEDRO, id: wamid, timestamp: String(Math.floor(ts / 1000)), type: "text", text: { body: "Mensagem nova" } }],
    }, ID_DO_NUMERO_B)
    expect(res.status).toBe(200)
    const { data: nova } = await service.from("messages").select("content, workspace_id").eq("wamid", wamid).single()
    expect(nova).toEqual({ content: "Mensagem nova", workspace_id: empresaB })
  })

  it("CA-B23-06: should pedir a agenda e o histórico à Meta uma vez só, logo após registrar a conexão em uso no celular", async () => {
    const idDoNumero = `pn_b23_06_${ts}`
    const chamadas: { url: string; body: string }[] = []
    const fetchDeVerdade = globalThis.fetch
    const metaFalsa = (isOnBizApp: boolean) =>
      vi.stubGlobal("fetch", (url: RequestInfo | URL, init?: RequestInit) => {
        const endereco = String(url)
        if (!endereco.includes("graph.facebook.com")) return fetchDeVerdade(url, init)
        chamadas.push({ url: endereco, body: String(init?.body ?? "") })
        const ok = (corpo: unknown) => new Response(JSON.stringify(corpo), { status: 200 })
        if (endereco.includes("/oauth/access_token")) return ok({ access_token: `token-${ts}` })
        if (endereco.includes(`/${idDoNumero}?fields=`)) return ok({ display_phone_number: `+55 11 9${sufixo.slice(0, 4)}-${sufixo.slice(4)}7`, verified_name: "Loja C", is_on_biz_app: isOnBizApp })
        if (endereco.endsWith("/smb_app_data")) return ok({ messaging_product: "whatsapp", request_id: "req" })
        return ok({ success: true })
      })
    clienteDaVez = adminC

    metaFalsa(true)
    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: idDoNumero, wabaId: `waba_c_${ts}` })).toEqual({})
    const pedidos = chamadas.filter((c) => c.url.endsWith(`/${idDoNumero}/smb_app_data`)).map((c) => JSON.parse(c.body).sync_type)
    expect(pedidos).toEqual(["smb_app_state_sync", "history"])
    const { data: criada } = await service.from("whatsapp_connections").select("id, historico_situacao, historico_progresso, historico_pedido_em").eq("workspace_id", empresaC).single()
    expect(criada!.historico_situacao).toBe("importando")
    expect(criada!.historico_pedido_em).not.toBeNull()
    expect(textoDaImportacao(criada!.historico_situacao, criada!.historico_progresso)).toBe("Trazendo conversas antigas (0%)")
    await service.from("whatsapp_connections").delete().eq("id", criada!.id)

    // Número comum (sem o aplicativo) não tem conversas antigas: nada é pedido.
    chamadas.length = 0
    metaFalsa(false)
    expect(await completarConexaoWhatsApp({ code: "codigo", phoneNumberId: idDoNumero, wabaId: `waba_c_${ts}` })).toEqual({})
    expect(chamadas.some((c) => c.url.endsWith("/smb_app_data"))).toBe(false)
    const { data: comum } = await service.from("whatsapp_connections").select("historico_situacao").eq("workspace_id", empresaC).single()
    expect(comum).toEqual({ historico_situacao: null })
  })
})
