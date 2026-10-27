// B44-03 — mídia recebida pelo canal direto: só do gateway, com tempo e tamanho
// limitados, e nunca guardada como página (auditoria de 27/10/2026). Busca e
// Storage simulados.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  guardarMidiaRecebida,
  LIMITE_DA_MIDIA_EM_BYTES,
  TEMPO_LIMITE_DA_MIDIA_MS,
} from "@/lib/whatsapp/midia-recebida"
import type { createServiceClient } from "@/integrations/supabase/service"

const WORKSPACE = "11111111-1111-1111-1111-111111111111"
const GATEWAY = "https://gateway.exemplo"
const MIDIA = { url: `${GATEWAY}/v1/media/med_01/conteudo`, mime_type: "image/jpeg", filename: null as string | null }

function storageFalso() {
  const uploads: Array<{ caminho: string; contentType?: string }> = []
  const supabase = {
    storage: {
      from: () => ({
        upload: vi.fn(async (caminho: string, _conteudo: unknown, opcoes?: { contentType?: string }) => {
          uploads.push({ caminho, contentType: opcoes?.contentType })
          return { error: null }
        }),
        getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://supabase.exemplo/storage/${caminho}` } }),
      }),
    },
  } as unknown as ReturnType<typeof createServiceClient>
  return { supabase, uploads }
}

const guardar = (midia: typeof MIDIA, buscar: unknown, supabase = storageFalso().supabase) =>
  guardarMidiaRecebida({ supabase, workspaceId: WORKSPACE, midia, instanceToken: "token-da-instancia", buscar: buscar as typeof fetch })

beforeEach(() => vi.stubEnv("GATEWAY_BASE_URL", GATEWAY))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("B44-03 — Mídia recebida só do gateway, limitada e nunca como página", () => {
  it("CA-B44-13: should not buscar mídia de endereço que não é do gateway, nem mandar o token", async () => {
    const { supabase, uploads } = storageFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8)))

    for (const url of ["https://atacante.exemplo/arquivo.jpg", "http://169.254.169.254/latest/meta-data", "https://gateway.exemplo.atacante.com/x"]) {
      expect(await guardar({ ...MIDIA, url }, buscar, supabase)).toBeNull()
    }
    expect(buscar).not.toHaveBeenCalled()
    expect(uploads).toEqual([])
  })

  it("CA-B44-13: should not buscar nada quando o endereço do gateway não está configurado", async () => {
    vi.stubEnv("GATEWAY_BASE_URL", "")
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8)))
    expect(await guardar(MIDIA, buscar)).toBeNull()
    expect(buscar).not.toHaveBeenCalled()
  })

  it("CA-B44-14: should desistir da mídia que declara mais de 100 MB, sem guardar", async () => {
    const { supabase, uploads } = storageFalso()
    const buscar = vi.fn(async () =>
      new Response(new ArrayBuffer(8), { headers: { "content-length": String(LIMITE_DA_MIDIA_EM_BYTES + 1) } })
    )
    expect(await guardar(MIDIA, buscar, supabase)).toBeNull()
    expect(uploads).toEqual([])
  })

  it("CA-B44-14: should parar de ler a mídia que passa de 100 MB sem declarar o tamanho", async () => {
    const { supabase, uploads } = storageFalso()
    const pedaco = new Uint8Array(10 * 1024 * 1024)
    let enviados = 0
    const corpo = new ReadableStream<Uint8Array>({
      pull(controle) {
        enviados += 1
        controle.enqueue(pedaco)
      },
    })
    const buscar = vi.fn(async () => new Response(corpo))

    expect(await guardar(MIDIA, buscar, supabase)).toBeNull()
    expect(uploads).toEqual([])
    expect(enviados).toBeLessThanOrEqual(12)
  })

  it("CA-B44-14: should desistir da mídia que passa do tempo limite de 60 segundos", async () => {
    const { supabase, uploads } = storageFalso()
    let sinal: AbortSignal | undefined
    const buscar = vi.fn((_url: string, init?: RequestInit) => {
      sinal = init?.signal ?? undefined
      return new Promise<Response>((_, falhar) => sinal?.addEventListener("abort", () => falhar(sinal?.reason)))
    })
    // O relógio do limite é trocado por um controle que o teste dispara.
    const relogio = new AbortController()
    const espera = vi.spyOn(AbortSignal, "timeout").mockReturnValue(relogio.signal)

    const resultado = guardar(MIDIA, buscar, supabase)
    expect(espera).toHaveBeenCalledWith(TEMPO_LIMITE_DA_MIDIA_MS)
    expect(TEMPO_LIMITE_DA_MIDIA_MS).toBe(60_000)
    expect(sinal).toBe(relogio.signal)
    relogio.abort(new DOMException("tempo esgotado", "TimeoutError"))
    expect(await resultado).toBeNull()
    expect(uploads).toEqual([])
    espera.mockRestore()
  })

  it("CA-B44-15: should guardar página HTML e SVG como download genérico, com extensão do CRM", async () => {
    const { supabase, uploads } = storageFalso()
    const buscar = vi.fn(async () => new Response("<script>alert(1)</script>"))

    const html = await guardar({ ...MIDIA, mime_type: "text/html", filename: "pagina.html" }, buscar, supabase)
    const svg = await guardar({ ...MIDIA, mime_type: "image/svg+xml", filename: "foto.svg" }, buscar, supabase)

    expect(uploads.map((u) => u.contentType)).toEqual(["application/octet-stream", "application/octet-stream"])
    expect(uploads.every((u) => u.caminho.endsWith(".bin"))).toBe(true)
    expect(html?.mimeType).toBe("application/octet-stream")
    expect(svg?.mimeType).toBe("application/octet-stream")
    expect(html?.filename).toBe("pagina.html")
  })

  it("CA-B44-15: should usar a extensão do tipo, não a do nome que veio de fora", async () => {
    const { supabase, uploads } = storageFalso()
    const buscar = vi.fn(async () => new Response(new ArrayBuffer(8)))

    await guardar({ ...MIDIA, mime_type: "application/pdf", filename: "tabela.html" }, buscar, supabase)

    expect(uploads[0]).toMatchObject({ contentType: "application/pdf" })
    expect(uploads[0].caminho).toMatch(/\.pdf$/)
  })
})
