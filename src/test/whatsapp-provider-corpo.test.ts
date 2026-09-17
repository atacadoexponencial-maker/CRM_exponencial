// Igualdade byte a byte do corpo da requisição.
//
// Este é o grupo que carrega a B1-01. A issue é refatoração que preserva
// comportamento, então o critério não é "envia", é "envia exatamente o que
// enviava antes" — mesma URL, mesma versão, mesmas chaves, na mesma ordem.
//
// Cada caso captura o corpo montado pelo provider e compara com o JSON literal
// que o código anterior produzia. Comparar a string, e não o objeto, é
// deliberado: ordem de chave e presença de chave opcional são exatamente o que
// pode quebrar em silêncio.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { criarProviderMeta } from "@/lib/whatsapp/provider-meta"

const PHONE_NUMBER_ID = "1167696503100575"
const ACCESS_TOKEN = "token-de-teste"
const DESTINO = "5521993911946"
const URL_ARQUIVO = "https://exemplo.supabase.co/storage/v1/object/public/chat-attachments/a.jpg"

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ messages: [{ id: "wamid.ABC" }] }),
    text: async () => "",
  })
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function provider() {
  return criarProviderMeta(PHONE_NUMBER_ID, ACCESS_TOKEN)
}

/** Devolve a URL chamada e o corpo cru (string), como saiu do provider. */
function requisicaoFeita() {
  const [url, opcoes] = fetchMock.mock.calls[0]
  return { url, opcoes, corpo: opcoes.body as string }
}

describe("URL e cabeçalhos", () => {
  it("chama v21.0/{phone_number_id}/messages", async () => {
    await provider().enviarTexto(DESTINO, "olá")

    expect(requisicaoFeita().url).toBe(
      `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`
    )
  })

  it("manda Authorization Bearer com o token da conexão", async () => {
    await provider().enviarTexto(DESTINO, "olá")

    const { opcoes } = requisicaoFeita()
    expect(opcoes.method).toBe("POST")
    expect(opcoes.headers["Content-Type"]).toBe("application/json")
    expect(opcoes.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
  })
})

describe("corpo — texto", () => {
  it("é idêntico ao que os três chamadores montavam", async () => {
    await provider().enviarTexto(DESTINO, "olá mundo")

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "text",
        text: { body: "olá mundo" },
      })
    )
  })
})

describe("corpo — imagem", () => {
  it("sem legenda: a chave caption NÃO aparece", async () => {
    await provider().enviarMidia(DESTINO, { url: URL_ARQUIVO, tipo: "imagem" })

    const { corpo } = requisicaoFeita()
    expect(corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "image",
        image: { link: URL_ARQUIVO },
      })
    )
    expect(corpo).not.toContain("caption")
  })

  it("com legenda: caption aparece depois de link", async () => {
    await provider().enviarMidia(DESTINO, {
      url: URL_ARQUIVO,
      tipo: "imagem",
      legenda: "promoção",
    })

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "image",
        image: { link: URL_ARQUIVO, caption: "promoção" },
      })
    )
  })

  it("com legenda VAZIA: caption aparece com string vazia", async () => {
    // A campanha manda caption mesmo quando a legenda é "" (campanhas.ts:42).
    // Trocar a regra por truthiness quebraria isso em silêncio.
    await provider().enviarMidia(DESTINO, {
      url: URL_ARQUIVO,
      tipo: "imagem",
      legenda: "",
    })

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "image",
        image: { link: URL_ARQUIVO, caption: "" },
      })
    )
  })
})

describe("corpo — documento", () => {
  it("pelo Chat: link e filename, sem caption", async () => {
    await provider().enviarMidia(DESTINO, {
      url: URL_ARQUIVO,
      tipo: "documento",
      nomeArquivo: "tabela.pdf",
    })

    const { corpo } = requisicaoFeita()
    expect(corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "document",
        document: { link: URL_ARQUIVO, filename: "tabela.pdf" },
      })
    )
    expect(corpo).not.toContain("caption")
  })

  it("por Campanha: link, caption e filename, nesta ordem", async () => {
    await provider().enviarMidia(DESTINO, {
      url: URL_ARQUIVO,
      tipo: "documento",
      legenda: "segue a tabela",
      nomeArquivo: "tabela.pdf",
    })

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "document",
        document: {
          link: URL_ARQUIVO,
          caption: "segue a tabela",
          filename: "tabela.pdf",
        },
      })
    )
  })

  it("sem nome de arquivo: a chave filename não aparece", async () => {
    await provider().enviarMidia(DESTINO, { url: URL_ARQUIVO, tipo: "documento" })

    expect(requisicaoFeita().corpo).not.toContain("filename")
  })
})

describe("corpo — vídeo e áudio", () => {
  it("vídeo: apenas link", async () => {
    await provider().enviarMidia(DESTINO, { url: URL_ARQUIVO, tipo: "video" })

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "video",
        video: { link: URL_ARQUIVO },
      })
    )
  })

  it("áudio: apenas link", async () => {
    await provider().enviarMidia(DESTINO, { url: URL_ARQUIVO, tipo: "audio" })

    expect(requisicaoFeita().corpo).toBe(
      JSON.stringify({
        messaging_product: "whatsapp",
        to: DESTINO,
        type: "audio",
        audio: { link: URL_ARQUIVO },
      })
    )
  })
})

describe("motivo do erro — unificado (decisão 5.4)", () => {
  it("inclui status e corpo da resposta", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
      text: async () => '{"error":{"message":"invalid"}}',
    })

    const resultado = await provider().enviarMidia(DESTINO, {
      url: URL_ARQUIVO,
      tipo: "video",
    })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      // Antes, vídeo e documento não incluíam o corpo. Agora incluem.
      expect(resultado.motivo).toBe('Meta API error: 400 - {"error":{"message":"invalid"}}')
    }
  })

  it("é montado mesmo quando o corpo do erro vem vazio", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "",
    })

    const resultado = await provider().enviarTexto(DESTINO, "olá")

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toBe("Meta API error: 500 - ")
  })
})
