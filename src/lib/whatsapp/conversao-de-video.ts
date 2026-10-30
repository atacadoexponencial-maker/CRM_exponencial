// B53-07: vídeo HEVC (H.265) recebido pela API Oficial vira H.264.
//
// O iPhone e alguns Android gravam em HEVC; o Chrome no Windows não decodifica, e
// o vídeo tocava só o som no Chat (reteste da Marcelle, 30/10/2026). No canal
// direto quem converte é o gateway (`src/midia/conversao.ts`, 20/10/2026); a
// Meta entrega o arquivo como veio, então aqui o CRM converte, com os mesmos
// parâmetros. Roda depois da resposta à Meta: a mensagem aparece na hora com o
// original, e o convertido toma o lugar dele no mesmo caminho do Storage.
//
// Falhar aqui não perde nada: o original continua, e o balão segue avisando que
// o formato é HEVC.

import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import ffmpegStatic from "ffmpeg-static"
import type { createServiceClient } from "@/integrations/supabase/service"

type ServiceClient = ReturnType<typeof createServiceClient>

const BUCKET = "chat-attachments"

/** O mesmo teto do gateway: acima disso a conversão demora demais para valer a pena. */
export const LIMITE_PARA_CONVERTER_EM_BYTES = 50 * 1024 * 1024
const TEMPO_LIMITE_DA_CONVERSAO_MS = 240_000

/** Vídeo marcado como HEVC por `mimeComCodec` (`midia-recebida.ts`). */
export function eVideoHevc(mimeType: string | null | undefined): boolean {
  return !!mimeType?.startsWith("video/") && /codecs=(hvc1|hev1)/.test(mimeType)
}

export type Converter = (conteudo: Uint8Array) => Promise<Uint8Array | null>

/** HEVC → H.264 com o ffmpeg empacotado. Null quando não deu. */
export const converterParaH264: Converter = async (conteudo) => {
  if (!ffmpegStatic || conteudo.byteLength > LIMITE_PARA_CONVERTER_EM_BYTES) return null
  const pasta = await mkdtemp(path.join(tmpdir(), "video-"))
  const entrada = path.join(pasta, "entrada.mp4")
  const saida = path.join(pasta, "saida.mp4")
  try {
    await writeFile(entrada, conteudo)
    const ok = await new Promise<boolean>((resolve) => {
      const processo = spawn(
        ffmpegStatic as string,
        ["-y", "-loglevel", "error", "-i", entrada, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", saida],
        { stdio: "ignore" }
      )
      const relogio = setTimeout(() => processo.kill("SIGKILL"), TEMPO_LIMITE_DA_CONVERSAO_MS)
      processo.on("error", () => {
        clearTimeout(relogio)
        resolve(false)
      })
      processo.on("close", (codigo) => {
        clearTimeout(relogio)
        resolve(codigo === 0)
      })
    })
    if (!ok) return null
    const convertido = await readFile(saida)
    return convertido.byteLength > 0 ? new Uint8Array(convertido) : null
  } catch {
    return null
  } finally {
    await rm(pasta, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * Troca o vídeo HEVC guardado em `caminho` pela versão H.264 e tira a marca de
 * HEVC da mensagem. Devolve se trocou.
 */
export async function converterVideoRecebido({
  supabase,
  mensagemId,
  caminho,
  converter = converterParaH264,
}: {
  supabase: ServiceClient
  mensagemId: string
  caminho: string
  converter?: Converter
}): Promise<boolean> {
  try {
    const { data: original, error } = await supabase.storage.from(BUCKET).download(caminho)
    if (error || !original) return false

    const convertido = await converter(new Uint8Array(await original.arrayBuffer()))
    if (!convertido) return false

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, convertido, { contentType: "video/mp4", upsert: true })
    if (erroUpload) return false

    const { error: erroMensagem } = await supabase
      .from("messages")
      .update({ media_mime_type: "video/mp4" })
      .eq("id", mensagemId)
    return !erroMensagem
  } catch {
    return false
  }
}
