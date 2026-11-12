// @vitest-environment node
// Auditoria run-2, pista 8 (06/11/2026): o vídeo recebido vai para o ffmpeg só quando é
// MP4/MOV de verdade (`ftyp` nos bytes 4 a 7), e o ffmpeg lê só como MP4/MOV, só arquivo
// local, sem referência a outro arquivo. Roda com o ffmpeg empacotado, como
// `conversao-de-video-recebido.test.ts`.

import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import ffmpegStatic from "ffmpeg-static"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { converterParaH264, eVideoHevc, gerarCapa } from "@/lib/whatsapp/conversao-de-video"
import { mimeComCodec } from "@/lib/whatsapp/midia-recebida"

const FFMPEG = ffmpegStatic as string
const pasta = mkdtempSync(path.join(tmpdir(), "pista-8-"))
afterAll(() => rmSync(pasta, { recursive: true, force: true }))

/** Um segundo de vídeo gerado pelo ffmpeg, com os argumentos de saída dados. */
function gerar(arquivo: string, saida: string[]): Uint8Array {
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=160x120:rate=15:duration=1", ...saida, arquivo])
  return new Uint8Array(readFileSync(arquivo))
}

/**
 * Uma playlist que se passa por vídeo HEVC: "ftyp" e "hvc1" num comentário, nos
 * primeiros 64 bytes, e um segmento que é um arquivo FORA da pasta da conversão.
 */
function playlistDisfarcada(alvo: string): Uint8Array {
  const texto = [
    "#EXTM3U",
    "#ftyp hvc1 isom",
    "#EXT-X-VERSION:3",
    "#EXT-X-TARGETDURATION:1",
    "#EXTINF:1.0,",
    `file:${alvo.replace(/\\/g, "/")}`,
    "#EXT-X-ENDLIST",
    "",
  ].join("\n")
  return new TextEncoder().encode(texto)
}

const fora = path.join(pasta, "arquivo-de-fora.mp4")
let hevc: Uint8Array
let mpegts: Uint8Array
let disfarcada: Uint8Array

beforeAll(() => {
  // HEVC declarado no cabeçalho, como o do iPhone
  hevc = gerar(fora, ["-c:v", "libx265", "-preset", "ultrafast", "-tag:v", "hvc1", "-brand", "hvc1"])
  // Vídeo válido, mas em outro formato: o ffmpeg converteria se adivinhasse o formato
  mpegts = gerar(path.join(pasta, "outro-formato.ts"), ["-c:v", "libx264", "-preset", "ultrafast", "-f", "mpegts"])
  disfarcada = playlistDisfarcada(fora)
}, 60_000)

describe("Auditoria run-2, pista 8 — vídeo recebido e ffmpeg", () => {
  it("a playlist com 'ftyp hvc1' num comentário não é marcada como HEVC", () => {
    // A trava antiga aceitava: as duas palavras estão nos primeiros 64 bytes
    expect(new TextDecoder("latin1").decode(disfarcada.subarray(0, 64))).toMatch(/ftyp[\s\S]*hvc1/)
    expect(eVideoHevc(mimeComCodec("video/mp4", disfarcada))).toBe(false)
  })

  it("o vídeo HEVC de verdade continua marcado", () => {
    expect(eVideoHevc(mimeComCodec("video/mp4", hevc))).toBe(true)
  })

  it("MOV antigo que não começa com 'ftyp' (ex.: caixa 'wide' antes) deixa de ser marcado, de propósito", () => {
    // 8 bytes da caixa `wide` e depois o `ftyp` com a marca hvc1: aceito antes, recusado agora
    const wide = new Uint8Array([0, 0, 0, 8, ...new TextEncoder().encode("wide")])
    expect(eVideoHevc(mimeComCodec("video/quicktime", new Uint8Array([...wide, ...hevc.subarray(0, 56)])))).toBe(false)
  })

  it("o ffmpeg lê só como MP4/MOV: um vídeo válido em outro formato é recusado", { timeout: 60_000 }, async () => {
    expect(await converterParaH264(mpegts)).toBeNull()
    expect(await gerarCapa(mpegts)).toBeNull()
  })

  // O ffmpeg 6.1.1 empacotado já recusava este caso sem a entrada fixa (conferido em
  // 06/11/2026). Fica como guarda: se uma versão nova do ffmpeg passar a ler a
  // playlist, a entrada fixa continua barrando, e este teste mostra.
  it("mesmo que a playlist chegue ao ffmpeg, ele não lê o arquivo de fora", { timeout: 60_000 }, async () => {
    expect(await converterParaH264(disfarcada)).toBeNull()
    expect(await gerarCapa(disfarcada)).toBeNull()
  })

  it("o vídeo HEVC de verdade continua virando H.264, e a capa sai", { timeout: 60_000 }, async () => {
    const convertido = await converterParaH264(hevc)
    expect(convertido).not.toBeNull()
    expect(eVideoHevc(mimeComCodec("video/mp4", convertido!))).toBe(false)
    expect(await gerarCapa(hevc)).not.toBeNull()
  })
})
