// @vitest-environment node
// B53-07 — vídeo HEVC recebido pela API Oficial vira H.264 (CA-B53-31) e chega à
// conversa aberta como no WhatsApp: a capa primeiro, o vídeo depois (CA-B53-34).
// A conversão de verdade roda com o ffmpeg empacotado em vídeos HEVC gerados aqui;
// o Storage, a tabela de mensagens e o tempo real são de mentira.

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import ffmpegStatic from "ffmpeg-static"
import { describe, it, expect, vi } from "vitest"
import { converterParaH264, converterVideoRecebido, eVideoHevc, gerarCapa } from "@/lib/whatsapp/conversao-de-video"
import { mimeComCodec } from "@/lib/whatsapp/midia-recebida"
import type { MensagemTransmitida } from "@/lib/whatsapp/realtime"

const FFMPEG = ffmpegStatic as string

/** Codec e medidas do primeiro vídeo do arquivo, pelo que o ffmpeg imprime ao ler. */
function lerVideo(bytes: Uint8Array): { codec: string | null; largura: number; altura: number } {
  const pasta = mkdtempSync(path.join(tmpdir(), "codec-"))
  const arquivo = path.join(pasta, "v.mp4")
  writeFileSync(arquivo, bytes)
  let saida = ""
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", arquivo], { stdio: ["ignore", "pipe", "pipe"] })
  } catch (erro) {
    // Sem saída indicada o ffmpeg termina com erro, mas imprime o que leu
    saida = String((erro as { stderr?: Buffer }).stderr ?? "")
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
  const medidas = /Video: .*?, (\d{2,5})x(\d{2,5})/.exec(saida)
  return {
    codec: /Video: (\w+)/.exec(saida)?.[1] ?? null,
    largura: Number(medidas?.[1] ?? 0),
    altura: Number(medidas?.[2] ?? 0),
  }
}

/** Um segundo de vídeo HEVC com som, em pé como o do iPhone. */
function videoHevc(largura = 320, altura = 240): Uint8Array {
  const pasta = mkdtempSync(path.join(tmpdir(), "hevc-"))
  const arquivo = path.join(pasta, "hevc.mp4")
  try {
    execFileSync(FFMPEG, [
      "-y", "-loglevel", "error",
      "-f", "lavfi", "-i", `testsrc=size=${largura}x${altura}:rate=15:duration=1`,
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx265", "-preset", "ultrafast", "-tag:v", "hvc1", "-c:a", "aac", "-shortest",
      // O iPhone declara o HEVC no cabeçalho do MP4, e é por ali que o CRM o reconhece
      "-brand", "hvc1", arquivo,
    ])
    return new Uint8Array(readFileSync(arquivo))
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}

const mensagem: MensagemTransmitida = {
  id: "msg-1",
  conversation_id: "conv-1",
  workspace_id: "ws-1",
  direction: "recebida",
  type: "video",
  content: "https://x.supabase.co/storage/v1/object/public/chat-attachments/ws-1/recebidas/1-video.mp4",
  created_at: "2026-10-30T13:53:26.000Z",
  status: null,
  media_mime_type: "video/mp4; codecs=hvc1",
  media_filename: null,
  media_thumbnail_url: null,
}

/** Supabase de mentira: guarda o que foi enviado ao Storage e à tabela de mensagens. */
function supabaseFalso(original: Uint8Array) {
  const uploads: Array<{ caminho: string; bytes: Uint8Array; opcoes: unknown }> = []
  const atualizacoes: Array<{ dados: unknown; id: unknown }> = []
  const cliente = {
    storage: {
      from: () => ({
        download: async () => ({ data: new Blob([original as BlobPart]), error: null }),
        upload: async (caminho: string, bytes: Uint8Array, opcoes: unknown) => {
          uploads.push({ caminho, bytes, opcoes })
          return { error: null }
        },
        getPublicUrl: (caminho: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/chat-attachments/${caminho}` } }),
      }),
    },
    from: () => ({
      update: (dados: unknown) => ({
        eq: async (_coluna: string, id: unknown) => {
          atualizacoes.push({ dados, id })
          return { error: null }
        },
      }),
    }),
  }
  return { cliente: cliente as never, uploads, atualizacoes }
}

describe("B53-07 — vídeo HEVC recebido pela API Oficial", () => {
  it("CA-B53-31: vídeo HEVC guardado vira H.264 no mesmo caminho e a mensagem deixa de ser HEVC", async () => {
    const hevc = videoHevc()
    expect(lerVideo(hevc).codec).toBe("hevc")
    // É assim que o webhook marca o vídeo ao guardar
    expect(eVideoHevc(mimeComCodec("video/mp4", hevc))).toBe(true)

    const { cliente, uploads, atualizacoes } = supabaseFalso(hevc)
    const caminho = "ws-1/recebidas/1-video.mp4"
    const trocou = await converterVideoRecebido({ supabase: cliente, mensagem, caminho, transmitir: vi.fn() })

    expect(trocou).toBe(true)
    const video = uploads.find((u) => u.caminho === caminho)!
    expect(video.opcoes).toEqual({ contentType: "video/mp4", upsert: true })
    expect(lerVideo(video.bytes).codec).toBe("h264")
    expect(eVideoHevc(mimeComCodec("video/mp4", video.bytes))).toBe(false)
    expect(atualizacoes).toContainEqual({ dados: { media_mime_type: "video/mp4" }, id: "msg-1" })
  }, 60_000)

  it("CA-B53-31: conversão que falha deixa o original e o tipo como estavam", async () => {
    const { cliente, uploads, atualizacoes } = supabaseFalso(new Uint8Array([1, 2, 3]))
    const converter = vi.fn().mockResolvedValue(null)

    const trocou = await converterVideoRecebido({
      supabase: cliente, mensagem, caminho: "x.mp4", converter, capa: vi.fn().mockResolvedValue(null), transmitir: vi.fn(),
    })

    expect(trocou).toBe(false)
    expect(converter).toHaveBeenCalledTimes(1)
    expect(uploads).toHaveLength(0)
    expect(atualizacoes).toHaveLength(0)
  })

  it("CA-B53-31: arquivo que não é vídeo de verdade não converte", async () => {
    expect(await converterParaH264(new Uint8Array([0, 1, 2, 3]))).toBeNull()
  })

  it("CA-B53-31: só vídeo marcado como HEVC é convertido", () => {
    expect(eVideoHevc("video/mp4; codecs=hvc1")).toBe(true)
    expect(eVideoHevc("video/mp4")).toBe(false)
    expect(eVideoHevc("image/jpeg")).toBe(false)
    expect(eVideoHevc(null)).toBe(false)
  })

  it("CA-B53-34: a capa sai antes do vídeo, e a conversa aberta recebe as duas", async () => {
    const ordem: string[] = []
    const { cliente, uploads } = supabaseFalso(new Uint8Array([9, 9, 9]))
    const transmitir = vi.fn(async (m: MensagemTransmitida) => {
      ordem.push(m.media_mime_type === "video/mp4" ? "video" : "capa")
    })

    const trocou = await converterVideoRecebido({
      supabase: cliente,
      mensagem,
      caminho: "ws-1/recebidas/1-video.mp4",
      capa: vi.fn().mockResolvedValue(new Uint8Array([1])),
      converter: vi.fn().mockResolvedValue(new Uint8Array([2])),
      transmitir,
    })

    expect(trocou).toBe(true)
    expect(uploads.map((u) => u.caminho)).toEqual(["ws-1/recebidas/1-video.mp4.thumb.jpg", "ws-1/recebidas/1-video.mp4"])
    expect(ordem).toEqual(["capa", "video"])
    // A segunda transmissão leva a capa e o tipo novo, com a mesma mensagem
    expect(transmitir).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: "msg-1",
        media_mime_type: "video/mp4",
        media_thumbnail_url: "https://x.supabase.co/storage/v1/object/public/chat-attachments/ws-1/recebidas/1-video.mp4.thumb.jpg",
      })
    )
  })

  it("CA-B53-34: vídeo em pé de 1080×1920 sai em 720p, e a capa é uma imagem", async () => {
    const grande = videoHevc(1080, 1920)
    const convertido = await converterParaH264(grande)
    expect(convertido).not.toBeNull()
    expect(lerVideo(convertido!)).toMatchObject({ codec: "h264", largura: 720, altura: 1280 })

    const capa = await gerarCapa(grande)
    // JPEG começa com FF D8
    expect(capa && [capa[0], capa[1]]).toEqual([0xff, 0xd8])
  }, 120_000)
})
