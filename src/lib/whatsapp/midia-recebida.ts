// Mídia recebida trazida do gateway para dentro do CRM (B6-03).
//
// A URL que o gateway entrega é **ponto de busca, não de armazenamento**: vale
// 24h e depois deixa de responder (A5-04 do gateway). Quem guarda é o CRM, no
// mesmo bucket `chat-attachments` que o envio do chat já usa.
//
// Falhar aqui não pode perder a mensagem: o chamador registra a mensagem com o
// texto e a legenda mesmo sem o arquivo. Um arquivo faltando é ruim; a mensagem
// do cliente desaparecer é pior.

import type { createServiceClient } from "@/integrations/supabase/service"

type ServiceClient = ReturnType<typeof createServiceClient>

const BUCKET = "chat-attachments"

/** Objeto `media` do contrato (seção 3.1). */
export type MidiaDoEvento = {
  url: string
  mime_type?: string | null
  size_bytes?: number | null
  filename?: string | null
  thumbnail_url?: string | null
  expires_at?: string | null
}

export type MidiaGuardada = {
  /** URL pública no Storage do CRM, para gravar em `messages.content`. */
  url: string
  mimeType: string | null
  /** Nome original, quando o WhatsApp mandou. */
  filename: string | null
  /** Miniatura (JPEG) no Storage do CRM, quando o gateway mandou uma. */
  thumbnailUrl: string | null
}

/**
 * Vídeo HEVC (H.265), padrão do iPhone e de alguns Android: o Chrome no Windows
 * não decodifica, e o player toca só o áudio com a tela preta (relato dela,
 * 20/10/2026). O cabeçalho do MP4 (caixa `ftyp`) lista as marcas compatíveis;
 * `hvc1`/`hev1` denunciam o HEVC. Devolve o mime com o codec, para a tela avisar.
 */
export function mimeComCodec(mimeType: string | null, inicio: Uint8Array): string | null {
  if (!mimeType?.startsWith("video/")) return mimeType
  const texto = new TextDecoder("latin1").decode(inicio.subarray(0, 64))
  if (!texto.includes("ftyp")) return mimeType
  if (/hvc1|hev1/.test(texto)) return `${mimeType}; codecs=hvc1`
  return mimeType
}

/** B44-03: limites da mídia recebida (SUP-B44-03): o maior documento do WhatsApp e um minuto. */
export const LIMITE_DA_MIDIA_EM_BYTES = 100 * 1024 * 1024
export const TEMPO_LIMITE_DA_MIDIA_MS = 60_000

/**
 * B44-03: tipos guardados como são, com a extensão que o CRM escolhe. Qualquer
 * outro (página HTML, SVG, tipo desconhecido) vira download genérico: o bucket é
 * público e o arquivo não pode abrir como página no navegador de quem clica.
 */
const EXTENSAO_DO_TIPO: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "video/quicktime": "mov",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
}
const TIPO_GENERICO = "application/octet-stream"

/** Tipo e extensão que o CRM grava, a partir do tipo declarado (nunca do nome). */
function tipoGuardado(mimeType: string | null): { contentType: string; extensao: string } {
  const base = mimeType?.split(";")[0].trim().toLowerCase() ?? ""
  const extensao = EXTENSAO_DO_TIPO[base]
  return extensao ? { contentType: base, extensao } : { contentType: TIPO_GENERICO, extensao: "bin" }
}

/** B44-03: só o endereço do gateway configurado recebe o token da instância. */
function eDoGateway(url: string, baseDoGateway: string | undefined): boolean {
  if (!baseDoGateway) return false
  try {
    return new URL(url).origin === new URL(baseDoGateway).origin
  } catch {
    return false
  }
}

/** Lê o corpo até o limite; passou dele, desiste e devolve null. */
async function lerComLimite(resposta: Response): Promise<ArrayBuffer | null> {
  const declarado = Number(resposta.headers.get("content-length"))
  if (declarado > LIMITE_DA_MIDIA_EM_BYTES) return null
  if (!resposta.body) return null

  const leitor = resposta.body.getReader()
  const pedacos: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await leitor.read()
    if (done) break
    total += value.byteLength
    if (total > LIMITE_DA_MIDIA_EM_BYTES) {
      await leitor.cancel()
      return null
    }
    pedacos.push(value)
  }
  const tudo = new Uint8Array(total)
  let posicao = 0
  for (const pedaco of pedacos) {
    tudo.set(pedaco, posicao)
    posicao += pedaco.byteLength
  }
  return tudo.buffer
}

/** Busca no gateway com token, tempo e tamanho limitados. Null quando não deve ou não deu. */
async function baixarDoGateway(
  url: string,
  instanceToken: string | null | undefined,
  buscar: typeof fetch
): Promise<{ conteudo: ArrayBuffer; tipo: string | null } | null> {
  if (!eDoGateway(url, process.env.GATEWAY_BASE_URL)) return null
  const resposta = await buscar(url, {
    headers: instanceToken ? { "X-Instance-Token": instanceToken } : undefined,
    signal: AbortSignal.timeout(TEMPO_LIMITE_DA_MIDIA_MS),
  })
  if (!resposta.ok) return null
  const conteudo = await lerComLimite(resposta)
  return conteudo ? { conteudo, tipo: resposta.headers.get("content-type") } : null
}

/**
 * Baixa do gateway e sobe para o Storage do CRM. Devolve `null` quando não
 * conseguiu — e quem chama segue sem o arquivo, sem perder a mensagem.
 *
 * `instanceToken` viaja porque o endereço da mídia é da instância dona (A5-02);
 * ele é segredo de backend e nunca chega ao navegador.
 */
export async function guardarMidiaRecebida({
  supabase,
  workspaceId,
  midia,
  instanceToken,
  buscar = fetch,
}: {
  supabase: ServiceClient
  workspaceId: string
  midia: MidiaDoEvento
  instanceToken?: string | null
  buscar?: typeof fetch
}): Promise<MidiaGuardada | null> {
  try {
    const baixada = await baixarDoGateway(midia.url, instanceToken, buscar)
    if (!baixada) return null

    const { conteudo } = baixada
    const { contentType, extensao } = tipoGuardado(midia.mime_type ?? baixada.tipo ?? null)
    // B44-03: o codec só vale para vídeo aceito; tipo recusado fica genérico.
    const mimeType = contentType === TIPO_GENERICO ? TIPO_GENERICO : mimeComCodec(contentType, new Uint8Array(conteudo))

    // Nome próprio, não o do remetente: nome de arquivo de fora não define
    // caminho nem extensão no nosso Storage. O original fica em `messages.media_filename`.
    const caminho = `${workspaceId}/recebidas/${Date.now()}-${crypto.randomUUID()}.${extensao}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, conteudo, { contentType })

    if (error) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(caminho)

    // Prévia (20/10/2026): a miniatura que o WhatsApp manda, guardada ao lado do
    // arquivo. Falhar aqui só deixa a mensagem sem prévia.
    let thumbnailUrl: string | null = null
    if (midia.thumbnail_url) {
      try {
        const miniatura = await baixarDoGateway(midia.thumbnail_url, instanceToken, buscar)
        if (miniatura) {
          const caminhoDaMiniatura = `${caminho}.thumb.jpg`
          const { error: erroMiniatura } = await supabase.storage
            .from(BUCKET)
            .upload(caminhoDaMiniatura, miniatura.conteudo, { contentType: "image/jpeg" })
          if (!erroMiniatura) thumbnailUrl = supabase.storage.from(BUCKET).getPublicUrl(caminhoDaMiniatura).data.publicUrl
        }
      } catch {
        // sem prévia
      }
    }

    return { url: publicUrl, mimeType, filename: midia.filename ?? null, thumbnailUrl }
  } catch {
    // Rede, tempo limite, endereço já expirado: nada disso derruba a mensagem.
    return null
  }
}
