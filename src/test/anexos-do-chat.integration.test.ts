// @vitest-environment node
// B49 — anexos do chat só para quem é da empresa. No banco de teste.
// O client SSR (cookies do Next) é trocado pelo client do "navegador" da vez, como na B21.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

import { buscarMensagens } from "@/app/(auth)/chat/actions"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { BUCKET_ANEXOS } from "@/lib/anexos-do-chat"

const URL_BANCO = process.env.NEXT_PUBLIC_SUPABASE_URL!
const servico = createClient(URL_BANCO, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const ts = Date.now()
const SENHA = "senha-segura-123"
let wsA = "", wsB = "", gerente = "", contato = "", conversa = ""
const caminhos: string[] = []

const publico = (caminho: string) => servico.storage.from(BUCKET_ANEXOS).getPublicUrl(caminho).data.publicUrl

async function guardar(caminho: string, conteudo: string, tipo: string): Promise<string> {
  const { error } = await servico.storage.from(BUCKET_ANEXOS).upload(caminho, new Blob([conteudo], { type: tipo }), { contentType: tipo })
  if (error) throw new Error(error.message)
  caminhos.push(caminho)
  return publico(caminho)
}

async function baixar(link: string): Promise<string | null> {
  const resposta = await fetch(link)
  return resposta.ok ? await resposta.text() : null
}

const ARQUIVOS = [
  { tipo: "imagem", direcao: "recebida", mime: "image/jpeg", texto: "foto recebida" },
  { tipo: "imagem", direcao: "enviada", mime: "image/jpeg", texto: "foto enviada" },
  { tipo: "audio", direcao: "recebida", mime: "audio/ogg", texto: "audio recebido" },
  { tipo: "video", direcao: "enviada", mime: "video/mp4", texto: "video enviado" },
  { tipo: "figurinha", direcao: "recebida", mime: "image/webp", texto: "figurinha recebida" },
  { tipo: "documento", direcao: "recebida", mime: "application/pdf", texto: "documento recebido" },
] as const

beforeAll(async () => {
  wsA = (await servico.from("workspaces").insert({ name: `B49 anexos A ${ts}` }).select("id").single()).data!.id
  wsB = (await servico.from("workspaces").insert({ name: `B49 anexos B ${ts}` }).select("id").single()).data!.id
  const email = `b49-gerente-${ts}@teste.com`
  gerente = (await servico.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
  await servico.from("profiles").insert({ id: gerente, workspace_id: wsA, name: "Gerente", role: "gerente" })
  clienteDaVez = createClient(URL_BANCO, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  await clienteDaVez.auth.signInWithPassword({ email, password: SENHA })

  contato = (await servico.from("contacts").insert({ workspace_id: wsA, name: "Cliente B49", phone_number: `55219${String(ts).slice(-8)}` }).select("id").single()).data!.id
  conversa = (await servico.from("conversations").insert({ workspace_id: wsA, contact_id: contato, status: "em_atendimento" }).select("id").single()).data!.id
}, 60_000)

afterAll(async () => {
  await servico.storage.from(BUCKET_ANEXOS).remove(caminhos)
  await servico.from("messages").delete().eq("conversation_id", conversa)
  await servico.from("conversations").delete().eq("id", conversa)
  await servico.from("pipeline_cards").delete().eq("workspace_id", wsA)
  await servico.from("contacts").delete().eq("id", contato)
  await servico.from("profiles").delete().eq("id", gerente)
  await servico.auth.admin.deleteUser(gerente)
  await servico.from("workspaces").delete().in("id", [wsA, wsB])
}, 60_000)

async function gravarMensagem(tipo: string, direcao: string, conteudo: string, miniatura?: string): Promise<string> {
  const { data, error } = await servico.from("messages").insert({
    workspace_id: wsA, conversation_id: conversa, direction: direcao, type: tipo, content: conteudo,
    ...(miniatura ? { media_thumbnail_url: miniatura } : {}),
  }).select("id").single()
  if (error) throw new Error(error.message)
  return data.id
}

describe("B49-01 — o chat mostra as mídias por link com prazo", { timeout: 60_000 }, () => {
  it("CA-B49-04: should devolver cada mídia, enviada e recebida, e a miniatura com link que baixa o arquivo certo", async () => {
    const esperado = new Map<string, string>()
    let idDoDocumento = ""
    for (const a of ARQUIVOS) {
      const endereco = await guardar(`${wsA}/${conversa}/${ts}-${a.tipo}-${a.direcao}`, a.texto, a.mime)
      const miniatura = a.tipo === "documento" ? await guardar(`${wsA}/recebidas/${ts}-doc.thumb.jpg`, "miniatura do documento", "image/jpeg") : undefined
      const id = await gravarMensagem(a.tipo, a.direcao, endereco, miniatura)
      esperado.set(id, a.texto)
      if (a.tipo === "documento") idDoDocumento = id
    }

    const mensagens = await buscarMensagens(conversa)
    for (const [id, texto] of esperado) {
      const m = mensagens.find((x) => x.id === id)!
      expect(m.conteudo).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
      expect(await baixar(m.conteudo)).toBe(texto)
    }
    const documento = mensagens.find((x) => x.id === idDoDocumento)!
    expect(documento.miniatura).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
    expect(await baixar(documento.miniatura!)).toBe("miniatura do documento")
  })

  it("CA-B49-03: should dar à foto um link que abre agora e vence em 1 hora", async () => {
    const id = await gravarMensagem("imagem", "recebida", await guardar(`${wsA}/recebidas/${ts}-prazo.jpg`, "foto do prazo", "image/jpeg"))
    const m = (await buscarMensagens(conversa)).find((x) => x.id === id)!

    expect(await baixar(m.conteudo)).toBe("foto do prazo")
    const token = new URL(m.conteudo).searchParams.get("token")!
    const { iat, exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
    expect(exp - iat).toBe(3600)
  })

  it("CA-B49-06: should mostrar a mídia de mensagem gravada com o endereço público antigo", async () => {
    const enderecoAntigo = await guardar(`${wsA}/recebidas/${ts}-antiga.jpg`, "foto antiga", "image/jpeg")
    expect(enderecoAntigo).toContain(`/object/public/${BUCKET_ANEXOS}/`)
    const id = await gravarMensagem("imagem", "recebida", enderecoAntigo)

    const m = (await buscarMensagens(conversa)).find((x) => x.id === id)!
    expect(m.conteudo).not.toBe(enderecoAntigo)
    expect(m.conteudo).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
    expect(await baixar(m.conteudo)).toBe("foto antiga")
  })

  it("CA-B49-07: should not dar link a arquivo de outra empresa, e as outras mídias seguem abrindo", async () => {
    const daOutra = await guardar(`${wsB}/recebidas/${ts}-segredo.jpg`, "foto da empresa B", "image/jpeg")
    // O arquivo da empresa B existe de verdade: a falta de link não é por ele faltar
    const { data: existe } = await servico.storage.from(BUCKET_ANEXOS).download(`${wsB}/recebidas/${ts}-segredo.jpg`)
    expect(await existe!.text()).toBe("foto da empresa B")

    const intrusa = await gravarMensagem("imagem", "recebida", daOutra, daOutra)
    const propria = await gravarMensagem("imagem", "recebida", await guardar(`${wsA}/recebidas/${ts}-propria.jpg`, "foto da empresa A", "image/jpeg"))

    const mensagens = await buscarMensagens(conversa)
    const m = mensagens.find((x) => x.id === intrusa)!
    expect(m.conteudo).toBe("")
    expect(m.miniatura).toBeUndefined()
    expect(await baixar(mensagens.find((x) => x.id === propria)!.conteudo)).toBe("foto da empresa A")
  })

  it("CA-B49-05: should transmitir a mídia que chega na hora com link que abre", async () => {
    const endereco = await guardar(`${wsA}/recebidas/${ts}-na-hora.jpg`, "foto na hora", "image/jpeg")
    const miniatura = await guardar(`${wsA}/recebidas/${ts}-na-hora.jpg.thumb.jpg`, "miniatura na hora", "image/jpeg")
    const id = await gravarMensagem("imagem", "recebida", endereco, miniatura)

    const fetchOriginal = globalThis.fetch
    const corpos: string[] = []
    const espiao = vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada, init) => {
      if (String(entrada).includes("/realtime/v1/api/broadcast")) {
        corpos.push(String(init?.body))
        return new Response("{}", { status: 202 })
      }
      return fetchOriginal(entrada, init)
    })
    try {
      await transmitirMensagem({
        id, conversation_id: conversa, workspace_id: wsA, direction: "recebida", type: "imagem",
        content: endereco, created_at: new Date().toISOString(), status: null, media_thumbnail_url: miniatura,
      })
    } finally {
      espiao.mockRestore()
    }

    expect(corpos.length).toBe(1)
    const { messages } = JSON.parse(corpos[0]) as { messages: Array<{ payload: { content: string; media_thumbnail_url: string } }> }
    for (const { payload } of messages) {
      expect(payload.content).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
      expect(await baixar(payload.content)).toBe("foto na hora")
      expect(await baixar(payload.media_thumbnail_url)).toBe("miniatura na hora")
    }
  })
})
