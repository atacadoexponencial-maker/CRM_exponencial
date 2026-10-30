// @vitest-environment node
// B53-07 — vídeo HEVC recebido pela API Oficial vira H.264 (CA-B53-31). A conversão
// de verdade roda com o ffmpeg empacotado num vídeo HEVC de 1 segundo gerado aqui;
// a troca no Storage e na mensagem usa um Supabase de mentira.

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import ffmpegStatic from "ffmpeg-static"
import { describe, it, expect, vi } from "vitest"
import { converterParaH264, converterVideoRecebido, eVideoHevc } from "@/lib/whatsapp/conversao-de-video"
import { mimeComCodec } from "@/lib/whatsapp/midia-recebida"

const FFMPEG = ffmpegStatic as string

/** Codec do primeiro vídeo do arquivo, pelo que o ffmpeg imprime ao ler. */
function codecDoVideo(bytes: Uint8Array): string | null {
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
  return /Video: (\w+)/.exec(saida)?.[1] ?? null
}

/** Um segundo de vídeo HEVC com som, como o iPhone grava. */
function videoHevc(): Uint8Array {
  const pasta = mkdtempSync(path.join(tmpdir(), "hevc-"))
  const arquivo = path.join(pasta, "hevc.mp4")
  try {
    execFileSync(FFMPEG, [
      "-y", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=1",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "libx265", "-tag:v", "hvc1", "-c:a", "aac", "-shortest",
      // O iPhone declara o HEVC no cabeçalho do MP4, e é por ali que o CRM o reconhece
      "-brand", "hvc1", arquivo,
    ])
    return new Uint8Array(readFileSync(arquivo))
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
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
    expect(codecDoVideo(hevc)).toBe("hevc")
    // É assim que o webhook marca o vídeo ao guardar
    expect(eVideoHevc(mimeComCodec("video/mp4", hevc))).toBe(true)

    const { cliente, uploads, atualizacoes } = supabaseFalso(hevc)
    const caminho = "empresa/recebidas/1-video.mp4"
    const trocou = await converterVideoRecebido({ supabase: cliente, mensagemId: "msg-1", caminho })

    expect(trocou).toBe(true)
    expect(uploads).toHaveLength(1)
    expect(uploads[0].caminho).toBe(caminho)
    expect(uploads[0].opcoes).toEqual({ contentType: "video/mp4", upsert: true })
    expect(codecDoVideo(uploads[0].bytes)).toBe("h264")
    expect(eVideoHevc(mimeComCodec("video/mp4", uploads[0].bytes))).toBe(false)
    expect(atualizacoes).toEqual([{ dados: { media_mime_type: "video/mp4" }, id: "msg-1" }])
  }, 60_000)

  it("CA-B53-31: conversão que falha deixa o original e o tipo como estavam", async () => {
    const { cliente, uploads, atualizacoes } = supabaseFalso(new Uint8Array([1, 2, 3]))
    const converter = vi.fn().mockResolvedValue(null)

    const trocou = await converterVideoRecebido({ supabase: cliente, mensagemId: "msg-2", caminho: "x.mp4", converter })

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
})
