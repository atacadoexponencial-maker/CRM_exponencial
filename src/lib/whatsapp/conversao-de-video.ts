// B53-07: vídeo HEVC (H.265) recebido pela API Oficial vira H.264.
//
// O iPhone e alguns Android gravam em HEVC; o Chrome no Windows não decodifica, e
// o vídeo tocava só o som no Chat (reteste da Marcelle, 30/10/2026). No canal
// direto quem converte é o gateway (`src/midia/conversao.ts`, 20/10/2026); a
// Meta entrega o arquivo como veio, então aqui o CRM converte. Roda depois da
// resposta à Meta: a mensagem aparece na hora com o original.
//
// Para chegar perto do WhatsApp (ela, 30/10/2026): primeiro sai a capa (o
// primeiro quadro), em cerca de 1 segundo; depois o vídeo convertido, em até
// 720p e no preset mais rápido. A cada passo a conversa aberta recebe a mensagem
// atualizada pelo tempo real e troca o balão sozinha.
//
// Falhar aqui não perde nada: o original continua, e o balão oferece o download.

import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import ffmpegStatic from "ffmpeg-static"
import type { createServiceClient } from "@/integrations/supabase/service"
import { transmitirMensagem, type MensagemTransmitida } from "@/lib/whatsapp/realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

const BUCKET = "chat-attachments"

/** O mesmo teto do gateway: acima disso a conversão demora demais para valer a pena. */
export const LIMITE_PARA_CONVERTER_EM_BYTES = 50 * 1024 * 1024
const TEMPO_LIMITE_DA_CONVERSAO_MS = 240_000

/** O lado menor do vídeo convertido: 720p, que no celular do cliente não perde nada. */
export const LADO_MENOR_DO_VIDEO = 720
const LADO_MENOR_DA_CAPA = 480

/** Reduz até `lado` no lado menor, sem aumentar vídeo pequeno; `-2` mantém a proporção com medida par. */
function reduzirAte(lado: number): string {
  return `scale='if(lt(iw,ih),min(${lado},iw),-2)':'if(lt(iw,ih),-2,min(${lado},ih))'`
}

/** Vídeo marcado como HEVC por `mimeComCodec` (`midia-recebida.ts`). */
export function eVideoHevc(mimeType: string | null | undefined): boolean {
  return !!mimeType?.startsWith("video/") && /codecs=(hvc1|hev1)/.test(mimeType)
}

export type Converter = (conteudo: Uint8Array) => Promise<Uint8Array | null>

/** Roda o ffmpeg com `entrada.mp4` na pasta e devolve o arquivo `saida`. Null quando não deu. */
async function comFfmpeg(conteudo: Uint8Array, saida: string, argumentos: (entrada: string, saida: string) => string[]): Promise<Uint8Array | null> {
  if (!ffmpegStatic || conteudo.byteLength > LIMITE_PARA_CONVERTER_EM_BYTES) return null
  const pasta = await mkdtemp(path.join(tmpdir(), "video-"))
  const entrada = path.join(pasta, "entrada.mp4")
  const destino = path.join(pasta, saida)
  try {
    await writeFile(entrada, conteudo)
    const ok = await new Promise<boolean>((resolve) => {
      const processo = spawn(ffmpegStatic as string, ["-y", "-loglevel", "error", ...argumentos(entrada, destino)], { stdio: "ignore" })
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
    const pronto = await readFile(destino)
    return pronto.byteLength > 0 ? new Uint8Array(pronto) : null
  } catch {
    return null
  } finally {
    await rm(pasta, { recursive: true, force: true }).catch(() => {})
  }
}

/** HEVC → H.264 até 720p, no preset mais rápido. Null quando não deu. */
export const converterParaH264: Converter = (conteudo) =>
  comFfmpeg(conteudo, "saida.mp4", (entrada, saida) => [
    "-i", entrada,
    "-vf", reduzirAte(LADO_MENOR_DO_VIDEO),
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-movflags", "+faststart", saida,
  ])

/** O primeiro quadro em JPEG, para a capa do balão. Null quando não deu. */
export const gerarCapa: Converter = (conteudo) =>
  comFfmpeg(conteudo, "capa.jpg", (entrada, saida) => [
    "-i", entrada, "-frames:v", "1", "-vf", reduzirAte(LADO_MENOR_DA_CAPA), "-q:v", "5", saida,
  ])

async function avisarATela(transmitir: typeof transmitirMensagem, mensagem: MensagemTransmitida): Promise<void> {
  try {
    await transmitir(mensagem)
  } catch {
    // sem tempo real desta vez: a conversa mostra o certo ao recarregar
  }
}

/**
 * Gera a capa e troca o vídeo HEVC guardado em `caminho` pela versão H.264, no
 * mesmo caminho. A cada passo grava na mensagem e avisa a conversa aberta.
 * Devolve se o vídeo foi trocado.
 */
export async function converterVideoRecebido({
  supabase,
  mensagem,
  caminho,
  converter = converterParaH264,
  capa = gerarCapa,
  transmitir = transmitirMensagem,
}: {
  supabase: ServiceClient
  /** A mensagem como foi gravada e transmitida, para a tela trocar o balão. */
  mensagem: MensagemTransmitida
  caminho: string
  converter?: Converter
  capa?: Converter
  transmitir?: typeof transmitirMensagem
}): Promise<boolean> {
  try {
    const { data: original, error } = await supabase.storage.from(BUCKET).download(caminho)
    if (error || !original) return false
    const bytes = new Uint8Array(await original.arrayBuffer())
    let atual = mensagem

    // 1) A capa, em cerca de 1 segundo: o balão mostra o quadro e "Preparando o vídeo…"
    const jpeg = await capa(bytes)
    if (jpeg) {
      const caminhoDaCapa = `${caminho}.thumb.jpg`
      const { error: erroCapa } = await supabase.storage
        .from(BUCKET)
        .upload(caminhoDaCapa, jpeg, { contentType: "image/jpeg", upsert: true })
      if (!erroCapa) {
        const miniatura = supabase.storage.from(BUCKET).getPublicUrl(caminhoDaCapa).data.publicUrl
        const { error: erroMensagem } = await supabase.from("messages").update({ media_thumbnail_url: miniatura }).eq("id", mensagem.id)
        if (!erroMensagem) {
          atual = { ...atual, media_thumbnail_url: miniatura }
          await avisarATela(transmitir, atual)
        }
      }
    }

    // 2) O vídeo que o navegador toca, no lugar do original
    const convertido = await converter(bytes)
    if (!convertido) return false

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, convertido, { contentType: "video/mp4", upsert: true })
    if (erroUpload) return false

    const { error: erroMensagem } = await supabase
      .from("messages")
      .update({ media_mime_type: "video/mp4" })
      .eq("id", mensagem.id)
    if (erroMensagem) return false

    await avisarATela(transmitir, { ...atual, media_mime_type: "video/mp4" })
    return true
  } catch {
    return false
  }
}
