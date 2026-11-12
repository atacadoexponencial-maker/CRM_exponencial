// @vitest-environment node
// B53-07 — mídia recebida pela API Oficial vira mídia no Chat. Bate no banco e no
// Storage de teste: chama o POST do webhook assinado como a Meta assina. Só o que
// iria à Meta (Graph API e o download) é simulado; o resto do fetch passa adiante.

import { createClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/automacoes/fila", () => ({ dispararAutomacoes: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/realtime", () => ({ transmitirMensagem: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/whatsapp/foto-de-perfil", () => ({ buscarEGuardarFotoDoContato: vi.fn().mockResolvedValue("sem_canal") }))

import { POST } from "@/app/api/webhooks/whatsapp/route"

const SEGREDO = "segredo-da-meta-b53-07"
const TOKEN = "token-da-conexao-b53-07"
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const ID_DO_NUMERO = `pn_b53_07_${ts}`
const TELEFONE = `55317${String(ts).slice(-8)}`
let empresa = "", conexao = ""
const fetchOriginal = globalThis.fetch

/** Bytes que a Meta "entrega" para cada id de mídia. */
const ARQUIVOS: Record<string, { bytes: Uint8Array; mime: string }> = {}

/**
 * A Meta de mentira: `GET graph.facebook.com/<versão>/<id>` devolve o endereço, e o
 * endereço devolve os bytes, os dois só com o token certo. `falhar` derruba tudo.
 */
function simularMeta({ falhar = false } = {}) {
  const pedidos: Array<{ url: string; autorizacao: string | null }> = []
  vi.stubGlobal("fetch", async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada instanceof Request ? entrada.url : entrada)
    const ehDaMeta = url.startsWith("https://graph.facebook.com/") || url.startsWith("https://lookaside.fbsbx.com/")
    if (!ehDaMeta) return fetchOriginal(entrada, init)

    const autorizacao = new Headers(init?.headers).get("authorization")
    pedidos.push({ url, autorizacao })
    if (falhar) return new Response(JSON.stringify({ error: { message: "erro" } }), { status: 500 })
    if (autorizacao !== `Bearer ${TOKEN}`) return new Response("sem token", { status: 401 })

    const graph = url.match(/^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/([^/?]+)$/)
    if (graph) {
      const arquivo = ARQUIVOS[graph[1]]
      if (!arquivo) return new Response("{}", { status: 404 })
      return Response.json({ url: `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=${graph[1]}`, mime_type: arquivo.mime, id: graph[1] })
    }
    const mid = new URL(url).searchParams.get("mid")
    const arquivo = mid ? ARQUIVOS[mid] : undefined
    if (!arquivo) return new Response("", { status: 404 })
    return new Response(new Blob([arquivo.bytes as Uint8Array<ArrayBuffer>]), { status: 200, headers: { "content-type": arquivo.mime } })
  })
  return pedidos
}

function novoArquivo(nome: string, mime: string): string {
  const id = `${nome}-${ts}-${Math.random().toString(36).slice(2, 8)}`
  ARQUIVOS[id] = { bytes: new TextEncoder().encode(`conteudo de ${id}`), mime }
  return id
}

async function receber(mensagem: Record<string, unknown>) {
  vi.stubEnv("META_APP_SECRET", SEGREDO)
  const wamid = `wamid.b53-07-${Math.random().toString(36).slice(2)}`
  const corpo = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [{
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: ID_DO_NUMERO },
          contacts: [{ wa_id: TELEFONE, profile: { name: "Cliente B53-07" } }],
          messages: [{ from: TELEFONE, id: wamid, timestamp: String(Math.floor(Date.now() / 1000)), ...mensagem }],
        },
      }],
    }],
  })
  const assinatura = "sha256=" + createHmac("sha256", SEGREDO).update(corpo).digest("hex")
  const res = await POST(new NextRequest("http://localhost/api/webhooks/whatsapp", {
    method: "POST", body: corpo, headers: { "x-hub-signature-256": assinatura },
  }))
  expect(res.status).toBe(200)
  const { data } = await service
    .from("messages")
    .select("type, content, media_mime_type, media_filename, media_caption, conversation_id")
    .eq("wamid", wamid)
    .single()
  return data!
}

/** O arquivo gravado existe no Storage da empresa e tem os bytes que a Meta entregou. */
async function conferirArquivo(content: string, idDaMidia: string) {
  const prefixo = `/storage/v1/object/public/chat-attachments/${empresa}/recebidas/`
  expect(content).toContain(prefixo)
  const caminho = decodeURIComponent(content.slice(content.indexOf(prefixo) + "/storage/v1/object/public/chat-attachments/".length))
  const { data, error } = await service.storage.from("chat-attachments").download(caminho)
  expect(error).toBeNull()
  expect(new Uint8Array(await data!.arrayBuffer())).toEqual(ARQUIVOS[idDaMidia].bytes)
}

beforeAll(async () => {
  empresa = (await service.from("workspaces").insert({ name: `[TESTE] B53-07 ${ts}` }).select("id").single()).data!.id
  conexao = (await service.from("whatsapp_connections").insert({
    workspace_id: empresa, canal: "meta", status: "connected", phone_number: `55119${String(ts).slice(-8)}`,
    display_name: "Loja B53-07", phone_number_id: ID_DO_NUMERO, waba_id: `waba_b53_07_${ts}`, access_token: TOKEN,
  }).select("id").single()).data!.id
}, 60_000)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

afterAll(async () => {
  const { data: arquivos } = await service.storage.from("chat-attachments").list(`${empresa}/recebidas`, { limit: 100 })
  if (arquivos?.length) await service.storage.from("chat-attachments").remove(arquivos.map((a) => `${empresa}/recebidas/${a.name}`))
  const { data: conversas } = await service.from("conversations").select("id").eq("workspace_id", empresa)
  const ids = (conversas ?? []).map((c) => c.id)
  if (ids.length) await service.from("messages").delete().in("conversation_id", ids)
  await service.from("conversations").delete().eq("workspace_id", empresa)
  await service.from("pipeline_cards").delete().eq("workspace_id", empresa)
  await service.from("contacts").delete().eq("workspace_id", empresa)
  await service.from("whatsapp_connections").delete().eq("id", conexao)
  await service.from("workspaces").delete().eq("id", empresa)
}, 60_000)

describe("B53-07 — mídia recebida pela API Oficial aparece no Chat", { timeout: 60_000 }, () => {
  it("CA-B53-12: should gravar a imagem como imagem, com o arquivo no Storage da empresa e a legenda à parte", async () => {
    const pedidos = simularMeta()
    const id = novoArquivo("imagem", "image/jpeg")

    const m = await receber({ type: "image", image: { id, mime_type: "image/jpeg", sha256: "x", caption: "Olha esse modelo" } })

    expect(m.type).toBe("imagem")
    expect(m.media_caption).toBe("Olha esse modelo")
    expect(m.media_mime_type).toBe("image/jpeg")
    await conferirArquivo(m.content, id)
    // Os dois pedidos à Meta levam o token da conexão
    expect(pedidos.map((p) => p.autorizacao)).toEqual([`Bearer ${TOKEN}`, `Bearer ${TOKEN}`])
    // A conversa mostra a legenda na prévia
    const { data: conversa } = await service.from("conversations").select("last_message_text").eq("id", m.conversation_id).single()
    expect(conversa!.last_message_text).toBe("Olha esse modelo")
  })

  it("CA-B53-12: should gravar áudio, vídeo, documento com o nome e figurinha com o tipo certo e o arquivo guardado", async () => {
    simularMeta()
    const audio = novoArquivo("audio", "audio/ogg")
    const video = novoArquivo("video", "video/mp4")
    const documento = novoArquivo("documento", "application/pdf")
    const figurinha = novoArquivo("figurinha", "image/webp")

    const a = await receber({ type: "audio", audio: { id: audio, mime_type: "audio/ogg; codecs=opus", voice: true } })
    expect(a.type).toBe("audio")
    await conferirArquivo(a.content, audio)

    const v = await receber({ type: "video", video: { id: video, mime_type: "video/mp4", caption: "Vídeo do produto" } })
    expect(v.type).toBe("video")
    expect(v.media_caption).toBe("Vídeo do produto")
    await conferirArquivo(v.content, video)

    const d = await receber({ type: "document", document: { id: documento, mime_type: "application/pdf", filename: "Tabela de preços.pdf" } })
    expect(d.type).toBe("documento")
    expect(d.media_filename).toBe("Tabela de preços.pdf")
    expect(d.content).toMatch(/\.pdf$/)
    await conferirArquivo(d.content, documento)

    const f = await receber({ type: "sticker", sticker: { id: figurinha, mime_type: "image/webp", animated: false } })
    expect(f.type).toBe("figurinha")
    await conferirArquivo(f.content, figurinha)
  })

  it('CA-B53-13: should gravar a mensagem com "Mídia não pôde ser carregada" quando o download na Meta falha', async () => {
    const pedidos = simularMeta({ falhar: true })
    const id = novoArquivo("falha", "image/jpeg")

    const m = await receber({ type: "image", image: { id, mime_type: "image/jpeg", caption: "Foto que não veio" } })

    expect(pedidos.length).toBeGreaterThan(0)
    expect(m.type).toBe("imagem")
    expect(m.content).toBe("Mídia não pôde ser carregada")
    expect(m.media_caption).toBe("Foto que não veio")
  })
})
