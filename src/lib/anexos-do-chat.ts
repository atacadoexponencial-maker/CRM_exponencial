// B49: os anexos do chat (foto, áudio, vídeo, figurinha e documento), das campanhas e
// das automações deixam de abrir para quem é de fora.
//
// A mensagem continua gravando o endereço público de sempre: ele só serve para achar
// o caminho do arquivo no bucket. A tela recebe um link assinado de 1 hora, e só de
// arquivo da própria empresa.
//
// **Só backend.** Assina com a chave de serviço.

import { createServiceClient } from "@/integrations/supabase/service"
import type { CanalWhatsApp } from "@/lib/whatsapp/tipos"

type ServiceClient = ReturnType<typeof createServiceClient>

export const BUCKET_ANEXOS = "chat-attachments"
/** Link assinado vale 1 hora, como a foto de perfil (decisão dela em 28/10/2026). */
export const VALIDADE_LINK_ANEXO_SEGUNDOS = 60 * 60
/**
 * O gateway guarda o pedido na fila e só baixa o arquivo quando a mensagem sai: uma
 * campanha grande, com o número em aquecimento, leva dias (decisão dela em 29/10/2026).
 * A Meta baixa na hora do pedido, e fica com 1 hora.
 */
export const VALIDADE_LINK_GATEWAY_SEGUNDOS = 30 * 24 * 60 * 60

export const AVISO_ARQUIVO_SEM_LINK = "Não foi possível preparar o arquivo para envio. Tente de novo."

const PREFIXO_PUBLICO = `/storage/v1/object/public/${BUCKET_ANEXOS}/`
const TIPOS_COM_ARQUIVO = new Set(["imagem", "audio", "video", "documento", "figurinha"])

/** Caminho no bucket a partir do endereço gravado na mensagem. Null se não for um anexo. */
export function caminhoDoAnexo(referencia: string | null | undefined): string | null {
  if (!referencia) return null
  const i = referencia.indexOf(PREFIXO_PUBLICO)
  if (i < 0) return null
  const caminho = decodeURIComponent(referencia.slice(i + PREFIXO_PUBLICO.length).split("?")[0])
  return caminho && !caminho.split("/").includes("..") ? caminho : null
}

function daEmpresa(caminho: string | null, workspaceId: string): caminho is string {
  return caminho !== null && caminho.startsWith(`${workspaceId}/`)
}

/**
 * Link que a Meta ou o gateway baixam na hora do envio. Null se o arquivo não for da
 * empresa ou não puder ser assinado: quem chama não manda.
 */
export async function linkParaEnvio(
  svc: ServiceClient,
  workspaceId: string,
  referencia: string,
  canal: CanalWhatsApp
): Promise<string | null> {
  const caminho = caminhoDoAnexo(referencia)
  if (!daEmpresa(caminho, workspaceId)) return null
  const validade = canal === "gateway" ? VALIDADE_LINK_GATEWAY_SEGUNDOS : VALIDADE_LINK_ANEXO_SEGUNDOS
  try {
    const { data } = await svc.storage.from(BUCKET_ANEXOS).createSignedUrl(caminho, validade)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

type LinhaComAnexo ={ type: string; content: string; media_thumbnail_url?: string | null }

/**
 * Troca o conteúdo e a miniatura das mensagens com arquivo pelo link assinado.
 * Anexo de outra empresa, ou que não pôde ser assinado, sai vazio (sem link).
 * Texto, nota e conteúdo que não é anexo passam como estão.
 */
export async function comLinksDosAnexos<T extends LinhaComAnexo>(
  svc: ServiceClient,
  workspaceId: string,
  linhas: T[]
): Promise<T[]> {
  const comArquivo = (l: T) => TIPOS_COM_ARQUIVO.has(l.type)
  const caminhos = new Set<string>()
  for (const l of linhas) {
    if (!comArquivo(l)) continue
    for (const c of [caminhoDoAnexo(l.content), caminhoDoAnexo(l.media_thumbnail_url)]) {
      if (daEmpresa(c, workspaceId)) caminhos.add(c)
    }
  }

  const links = new Map<string, string>()
  if (caminhos.size > 0) {
    try {
      const { data } = await svc.storage.from(BUCKET_ANEXOS).createSignedUrls([...caminhos], VALIDADE_LINK_ANEXO_SEGUNDOS)
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) links.set(item.path, item.signedUrl)
      }
    } catch {
      // Sem link: a mídia aparece vazia em vez de derrubar a conversa inteira.
    }
  }

  const trocar = (referencia: string | null | undefined): string | null => {
    const caminho = caminhoDoAnexo(referencia)
    if (caminho === null) return referencia ?? null
    return daEmpresa(caminho, workspaceId) ? links.get(caminho) ?? null : null
  }

  return linhas.map((l) => {
    if (!comArquivo(l)) return l
    const linha = { ...l, content: trocar(l.content) ?? "" }
    if (l.media_thumbnail_url !== undefined) linha.media_thumbnail_url = trocar(l.media_thumbnail_url)
    return linha
  })
}
