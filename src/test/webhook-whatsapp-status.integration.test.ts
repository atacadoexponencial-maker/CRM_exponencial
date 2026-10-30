// @vitest-environment node
// B53-05 — avisos de status da API Oficial: nenhum se perde e nenhum faz o status voltar.
// Bate no banco de teste: chama o POST do webhook da Meta assinado como ela assina e
// confere a mensagem do Chat e o destinatário da campanha gravados.

import { createClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"
import { NextRequest } from "next/server"

// O webhook não pode chamar a fila de automações nem transmitir no tempo real aqui.
vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))

import { POST } from "@/app/api/webhooks/whatsapp/route"

const SEGREDO = "segredo-da-meta-b53-05"
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const ID_DO_NUMERO = `pn_b53_05_${ts}`
let empresa = "", conexao = "", contato = "", conversa = "", campanha = ""

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B53-05 ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: `55119${String(ts).slice(-8)}`,
    display_name: "Loja B53-05", phone_number_id: ID_DO_NUMERO, waba_id: `waba_b53_05_${ts}`, access_token: "token-b53-05",
  }).select("id").single()).data!.id
  contato = (await service.from("contacts").insert({ workspace_id: empresa, name: "Cliente B53-05", phone_number: `55318${String(ts).slice(-8)}` }).select("id").single()).data!.id
  conversa = (await service.from("conversations").insert({ workspace_id: empresa, contact_id: contato, status: "em_atendimento", whatsapp_connection_id: conexao }).select("id").single()).data!.id
  campanha = (await service.from("campaigns").insert({ workspace_id: empresa, nome: "Campanha B53-05", conteudo: "Oi", status: "enviada" }).select("id").single()).data!.id
}, 60_000)

afterEach(() => {
  vi.unstubAllEnvs()
})

afterAll(async () => {
  await service.from("campaign_recipients").delete().eq("campaign_id", campanha)
  await service.from("campaigns").delete().eq("id", campanha)
  await service.from("messages").delete().eq("conversation_id", conversa)
  await service.from("conversations").delete().eq("id", conversa)
  await service.from("contacts").delete().eq("id", contato)
  await service.from("whatsapp_connections").delete().eq("id", conexao)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

/** Mensagem do Chat e destinatário da campanha com o mesmo wamid e o mesmo status. */
async function enviadaComStatus(wamid: string, status: string) {
  const { error: e1 } = await service.from("messages").insert({
    workspace_id: empresa, conversation_id: conversa, direction: "enviada", type: "texto", content: "Oi", wamid, status,
  })
  if (e1) throw new Error(e1.message)
  const { error: e2 } = await service.from("campaign_recipients").insert({
    campaign_id: campanha, workspace_id: empresa, contact_id: contato, nome_snapshot: "Cliente B53-05",
    telefone_snapshot: "5531999990000", wamid, status,
  })
  if (e2) throw new Error(e2.message)
}

async function statusGravado(wamid: string) {
  const { data: m } = await service.from("messages").select("status").eq("wamid", wamid).single()
  const { data: d } = await service.from("campaign_recipients").select("status").eq("wamid", wamid).single()
  return { chat: m?.status, campanha: d?.status }
}

type Aviso = { id: string; status: string }

/** O pacote como a Meta manda: cada item de `entradas` é uma entry, com uma change por bloco. */
async function receber(entradas: Aviso[][][]) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: entradas.map((blocos) => ({
      changes: blocos.map((avisos) => ({
        field: "messages",
        value: {
          metadata: { phone_number_id: ID_DO_NUMERO },
          statuses: avisos.map((a) => ({ ...a, timestamp: "1761800000", recipient_id: "5531999990000" })),
        },
      })),
    })),
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura },
  }))
  expect(res.status).toBe(200)
}

describe("B53-05 — leitura das campanhas não regride", { timeout: 60_000 }, () => {
  it('CA-B53-08: should manter "lido" no destinatário e no Chat quando chega um "entregue" atrasado', async () => {
    const wamid = `wamid.b53-08-lido-${ts}`
    await enviadaComStatus(wamid, "enviado")

    await receber([[[{ id: wamid, status: "read" }]]])
    expect(await statusGravado(wamid)).toEqual({ chat: "lido", campanha: "lido" })

    await receber([[[{ id: wamid, status: "delivered" }]]])
    expect(await statusGravado(wamid)).toEqual({ chat: "lido", campanha: "lido" })

    // "falhou" também nunca vem depois de "lido"
    await receber([[[{ id: wamid, status: "failed" }]]])
    expect(await statusGravado(wamid)).toEqual({ chat: "lido", campanha: "lido" })
  })

  it('CA-B53-08: should avançar de "enviado" para "entregue", e "falhou" não sobrescreve "entregue"', async () => {
    const wamid = `wamid.b53-08-entregue-${ts}`
    await enviadaComStatus(wamid, "enviado")

    await receber([[[{ id: wamid, status: "delivered" }]]])
    expect(await statusGravado(wamid)).toEqual({ chat: "entregue", campanha: "entregue" })

    await receber([[[{ id: wamid, status: "failed" }]]])
    expect(await statusGravado(wamid)).toEqual({ chat: "entregue", campanha: "entregue" })
  })

  it("CA-B53-09: should gravar o status de todos os destinatários do pacote, em blocos e entradas diferentes", async () => {
    const a = `wamid.b53-09-a-${ts}`
    const b = `wamid.b53-09-b-${ts}`
    const c = `wamid.b53-09-c-${ts}`
    await enviadaComStatus(a, "enviado")
    await enviadaComStatus(b, "enviado")
    await enviadaComStatus(c, "enviado")

    // Primeira entry com dois blocos (changes); segunda entry com um terceiro.
    await receber([
      [[{ id: a, status: "delivered" }], [{ id: b, status: "read" }]],
      [[{ id: c, status: "read" }]],
    ])

    expect(await statusGravado(a)).toEqual({ chat: "entregue", campanha: "entregue" })
    expect(await statusGravado(b)).toEqual({ chat: "lido", campanha: "lido" })
    expect(await statusGravado(c)).toEqual({ chat: "lido", campanha: "lido" })
  })
})
