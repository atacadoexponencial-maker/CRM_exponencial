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
}

/** Extensão a partir do nome original ou do mime; `bin` quando não há pista. */
function extensaoDe(midia: MidiaDoEvento): string {
  const doNome = midia.filename?.includes(".") ? midia.filename.split(".").pop() : null
  if (doNome) return doNome.toLowerCase()

  const doMime = midia.mime_type?.split("/")[1]?.split(";")[0]
  return doMime ? doMime.toLowerCase() : "bin"
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
    const resposta = await buscar(midia.url, {
      headers: instanceToken ? { "X-Instance-Token": instanceToken } : undefined,
    })
    if (!resposta.ok) return null

    const conteudo = await resposta.arrayBuffer()
    const mimeType = midia.mime_type ?? resposta.headers.get("content-type") ?? null

    // Nome próprio, não o do remetente: nome de arquivo de fora não define
    // caminho no nosso Storage. O original fica em `messages.media_filename`.
    const caminho = `${workspaceId}/recebidas/${Date.now()}-${crypto.randomUUID()}.${extensaoDe(midia)}`

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, conteudo, { contentType: mimeType ?? "application/octet-stream" })

    if (error) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(caminho)

    return { url: publicUrl, mimeType, filename: midia.filename ?? null }
  } catch {
    // Rede, tempo limite, endereço já expirado: nada disso derruba a mensagem.
    return null
  }
}
