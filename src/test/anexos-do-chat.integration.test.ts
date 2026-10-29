// @vitest-environment node
// B49 — anexos do chat só para quem é da empresa. No banco de teste.
// O client SSR (cookies do Next) é trocado pelo client do "navegador" da vez, como na B21.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"

let clienteDaVez: SupabaseClient
vi.mock("@/integrations/supabase/server", () => ({ createClient: async () => clienteDaVez }))

/** B49-02: canal de envio falso, que guarda o link que a Meta ou o gateway baixariam. */
const linksEnviados: string[] = []
const canalFalso = {
  canal: "meta" as "meta" | "gateway",
  suporta: () => true,
  enviarTexto: vi.fn(async () => ({ ok: true, mensagemId: "wamid-texto" })),
  enviarMidia: vi.fn(async (_destino: string, midia: { url: string }) => {
    linksEnviados.push(midia.url)
    return { ok: true, mensagemId: `wamid-b49-${linksEnviados.length}-${Date.now()}` }
  }),
}
vi.mock("@/lib/whatsapp", async (original) => ({
  ...(await original<typeof import("@/lib/whatsapp")>()),
  resolverProviderDaConversa: vi.fn(async () => canalFalso),
  resolverProviderDoContato: vi.fn(async () => canalFalso),
}))
vi.mock("@/lib/automacoes/gatilhos-do-crm", () => ({
  dispararEtiquetaAplicada: vi.fn(),
  dispararMensagemEnviadaPeloTime: vi.fn(),
}))

import { buscarMensagens, enviarAudio, enviarDocumento, enviarImagem, enviarVideo } from "@/app/(auth)/chat/actions"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { enviarWhatsAppComMotivo } from "@/lib/whatsapp-envio"
import { apagarDaLixeira } from "@/lib/lixeira"
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

function payloadDoToken(link: string): { iat: number; exp: number } {
  const token = new URL(link).searchParams.get("token")!
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
}

describe("B49-02 — envio e limpeza não dependem mais do link aberto", { timeout: 90_000 }, () => {
  it("CA-B49-09: should passar à Meta e ao gateway um link que baixa o arquivo, pelos quatro envios do chat", async () => {
    const envios = [
      { enviar: enviarImagem, arquivo: new File(["foto pelo chat"], "foto.jpg", { type: "image/jpeg" }) },
      { enviar: enviarDocumento, arquivo: new File(["tabela pelo chat"], "tabela.pdf", { type: "application/pdf" }) },
      { enviar: enviarVideo, arquivo: new File(["video pelo chat"], "video.mp4", { type: "video/mp4" }) },
      { enviar: enviarAudio, arquivo: new File(["audio pelo chat"], "audio.ogg", { type: "audio/ogg" }) },
    ]
    for (const canal of ["meta", "gateway"] as const) {
      canalFalso.canal = canal
      for (const { enviar, arquivo } of envios) {
        linksEnviados.length = 0
        const formData = new FormData()
        formData.append("arquivo", arquivo)
        expect((await enviar(conversa, formData)).erro).toBeUndefined()

        const [link] = linksEnviados
        expect(link).toContain(`/object/sign/${BUCKET_ANEXOS}/`)
        caminhos.push(decodeURIComponent(new URL(link).pathname.split(`/object/sign/${BUCKET_ANEXOS}/`)[1]))
        // Sem login, como a Meta e o gateway baixam
        expect(await baixar(link)).toBe(await arquivo.text())
        // A Meta baixa na hora; o gateway, quando a mensagem sai da fila
        const { iat, exp } = payloadDoToken(link)
        expect(exp - iat).toBe(canal === "meta" ? 3600 : 30 * 24 * 3600)
      }
    }
    canalFalso.canal = "meta"
  })

  it("CA-B49-11: should passar ao executar a automação um link gerado agora, que baixa o arquivo", async () => {
    // O endereço guardado no fluxo quando a automação foi configurada
    const doFluxo = await guardar(`${wsA}/automacoes/${ts}-tabela.pdf`, "tabela da automacao", "application/pdf")
    linksEnviados.length = 0
    const antes = Math.floor(Date.now() / 1000) - 5

    const resultado = await enviarWhatsAppComMotivo(servico as never, wsA, contato, { tipo: "documento", url: doFluxo, nomeArquivo: "tabela.pdf" }, conversa)

    expect(resultado).toEqual({ ok: true })
    const [link] = linksEnviados
    expect(link).not.toBe(doFluxo)
    expect(payloadDoToken(link).iat).toBeGreaterThanOrEqual(antes)
    expect(await baixar(link)).toBe("tabela da automacao")
  })

  it("CA-B49-14: should apagar da lixeira os arquivos das mensagens, recebidas e enviadas, e deixar os de campanha", async () => {
    const naLixeira = (await servico.from("contacts").insert({ workspace_id: wsA, name: "Cliente da lixeira", phone_number: `55218${String(ts).slice(-8)}` }).select("id").single()).data!.id
    const conversaDaLixeira = (await servico.from("conversations").insert({ workspace_id: wsA, contact_id: naLixeira, status: "em_atendimento" }).select("id").single()).data!.id
    const recebida = `${wsA}/recebidas/${ts}-lixeira.jpg`
    const enviada = `${wsA}/${conversaDaLixeira}/${ts}-lixeira.pdf`
    const daCampanha = `${wsA}/campanhas/${ts}-lixeira.png`
    await servico.from("messages").insert([
      { workspace_id: wsA, conversation_id: conversaDaLixeira, direction: "recebida", type: "imagem", content: await guardar(recebida, "recebida", "image/jpeg") },
      { workspace_id: wsA, conversation_id: conversaDaLixeira, direction: "enviada", type: "imagem", content: await guardar(daCampanha, "campanha", "image/png") },
    ])
    // A enviada passa pelo envio de agora (B49-02), que grava o endereço do arquivo
    expect(await enviarWhatsAppComMotivo(servico as never, wsA, naLixeira, { tipo: "documento", url: await guardar(enviada, "enviada", "application/pdf"), nomeArquivo: "x.pdf" }, conversaDaLixeira)).toEqual({ ok: true })
    await servico.from("contacts").update({ excluido_em: new Date().toISOString() }).eq("id", naLixeira)

    expect(await apagarDaLixeira(servico as never, wsA, naLixeira)).toBe(true)

    const existe = async (caminho: string) => !(await servico.storage.from(BUCKET_ANEXOS).download(caminho)).error
    expect(await existe(recebida)).toBe(false)
    expect(await existe(enviada)).toBe(false)
    expect(await existe(daCampanha)).toBe(true)
  })
})

describe("B49-03 — anexos fechados para quem é de fora", { timeout: 60_000 }, () => {
  it("CA-B49-01: should not abrir, sem login, o endereço público de um anexo", async () => {
    const caminho = `${wsA}/recebidas/${ts}-fechado.jpg`
    const endereco = await guardar(caminho, "foto fechada", "image/jpeg")
    // O arquivo existe: o servidor ainda o lê com a chave de serviço
    expect(await (await servico.storage.from(BUCKET_ANEXOS).download(caminho)).data!.text()).toBe("foto fechada")

    const resposta = await fetch(endereco)
    expect(resposta.ok).toBe(false)
    expect(await resposta.text()).not.toBe("foto fechada")
  })

  it("CA-B49-02: should recusar o usuário logado de outra empresa que tenta baixar o anexo", async () => {
    const caminho = `${wsA}/recebidas/${ts}-da-empresa-a.jpg`
    await guardar(caminho, "foto da empresa A", "image/jpeg")
    expect(await (await servico.storage.from(BUCKET_ANEXOS).download(caminho)).data!.text()).toBe("foto da empresa A")

    const email = `b49-outra-${ts}@teste.com`
    const deB = (await servico.auth.admin.createUser({ email, password: SENHA, email_confirm: true })).data.user!.id
    try {
      await servico.from("profiles").insert({ id: deB, workspace_id: wsB, name: "Gerente B", role: "gerente" })
      const navegadorB = createClient(URL_BANCO, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
      await navegadorB.auth.signInWithPassword({ email, password: SENHA })

      const { data, error } = await navegadorB.storage.from(BUCKET_ANEXOS).download(caminho)
      expect(data).toBeNull()
      expect(error).not.toBeNull()
      const { data: assinado } = await navegadorB.storage.from(BUCKET_ANEXOS).createSignedUrl(caminho, 60)
      expect(assinado).toBeNull()
    } finally {
      await servico.from("profiles").delete().eq("id", deB)
      await servico.auth.admin.deleteUser(deB)
    }
  })
})