// B29-02: a foto de perfil do contato, buscada pelo canal direto.
//
// O WhatsApp só entrega a foto pelo canal direto (o gateway), e o endereço que
// ele dá vence em pouco tempo. O gateway baixa a imagem (B29-01) e o CRM guarda
// uma cópia num bucket PRIVADO; a tela recebe um endereço assinado de 1 hora.
//
// Uma vez só por contato: achou, guarda e nunca mais busca; "sem foto" também é
// definitivo. Só falha técnica (gateway fora do ar, demorou, upload falhou)
// deixa `photo_checked_at` nulo, e a próxima mensagem do contato tenta de novo.
//
// **Só backend.** Lê `instance_token` e grava no storage com a chave de serviço.

import { createServiceClient } from "@/integrations/supabase/service"
import { transmitirContatoFoto } from "./realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

export const BUCKET_FOTOS = "contact-photos"
/** Endereço assinado vale 1 hora: a lista do chat é recarregada bem antes disso. */
export const VALIDADE_URL_FOTO_SEGUNDOS = 60 * 60
/** Mesmo limite da conferência de mídia: uma foto pequena não demora. */
export const TEMPO_LIMITE_FOTO_MS = 10_000

export type ResultadoDaBusca =
  | "guardada"
  | "sem_foto"
  | "ja_conferida"
  | "sem_canal"
  | "sem_telefone"
  | "falhou"

export function caminhoDaFoto(workspaceId: string, contactId: string): string {
  return `${workspaceId}/${contactId}.jpg`
}

type ConexaoParaFoto = { id: string; instance_id: string; instance_token: string }

/**
 * Qual número do canal direto busca a foto: o da mensagem, se for do canal
 * direto e estiver conectado; senão, qualquer um conectado da empresa (decisão
 * dela em 20/10: contato que chegou pela Meta também ganha foto).
 */
async function escolherConexao(svc: ServiceClient, workspaceId: string, connectionId: string | null): Promise<ConexaoParaFoto | null> {
  const { data } = await svc
    .from("whatsapp_connections")
    .select("id, instance_id, instance_token")
    .eq("workspace_id", workspaceId)
    .eq("canal", "gateway")
    .eq("status", "connected")
    .not("instance_id", "is", null)
    .not("instance_token", "is", null)
    .order("created_at", { ascending: true })
    .limit(20)

  const conexoes = (data ?? []) as ConexaoParaFoto[]
  return conexoes.find((c) => c.id === connectionId) ?? conexoes[0] ?? null
}

export type FotoBaixada = { corpo: ArrayBuffer; mimeType: string }

/**
 * `GET /instances/:id/contacts/:phone/photo` do gateway (B29-01). Null no 204
 * ("sem foto"). Lança em qualquer outra recusa ou falha de rede.
 */
export async function baixarFotoDoGateway({
  conexao,
  telefone,
  buscar = fetch,
  baseUrl = process.env.GATEWAY_BASE_URL,
}: {
  conexao: Pick<ConexaoParaFoto, "instance_id" | "instance_token">
  telefone: string
  buscar?: typeof fetch
  baseUrl?: string
}): Promise<FotoBaixada | null> {
  if (!baseUrl) throw new Error("GATEWAY_BASE_URL não configurada")
  const base = baseUrl.replace(/\/+$/, "")
  const resposta = await buscar(`${base}/instances/${encodeURIComponent(conexao.instance_id)}/contacts/${encodeURIComponent(telefone)}/photo`, {
    headers: { "X-Instance-Token": conexao.instance_token },
    signal: AbortSignal.timeout(TEMPO_LIMITE_FOTO_MS),
  })
  if (resposta.status === 204) return null
  if (!resposta.ok) throw new Error(`O gateway recusou a foto (HTTP ${resposta.status}).`)
  const mimeType = resposta.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg"
  return { corpo: await resposta.arrayBuffer(), mimeType }
}

/**
 * Busca e guarda a foto de um contato que acabou de nascer (ou que ainda não
 * foi conferido). Nunca lança: quem chama já gravou a mensagem, o lead ou o
 * pedido, e a foto não pode atrasar nem derrubar nada disso.
 */
export async function buscarEGuardarFotoDoContato({
  svc = createServiceClient(),
  workspaceId,
  contactId,
  telefone,
  connectionId = null,
  buscar,
  baseUrl,
}: {
  svc?: ServiceClient
  workspaceId: string
  contactId: string
  telefone: string
  /** Número por onde o contato escreveu, quando houver. */
  connectionId?: string | null
  buscar?: typeof fetch
  baseUrl?: string
}): Promise<ResultadoDaBusca> {
  try {
    // LID (B7) não é telefone: o gateway não consulta.
    if (!/^\d{8,15}$/.test(telefone)) return "sem_telefone"

    const { data: contato } = await svc.from("contacts").select("photo_checked_at").eq("id", contactId).maybeSingle()
    if (!contato) return "falhou"
    if (contato.photo_checked_at) return "ja_conferida"

    const conexao = await escolherConexao(svc, workspaceId, connectionId)
    if (!conexao) return "sem_canal"

    const foto = await baixarFotoDoGateway({ conexao, telefone, buscar, baseUrl })
    const agora = new Date().toISOString()

    if (!foto) {
      const { error } = await svc.from("contacts").update({ photo_path: null, photo_checked_at: agora }).eq("id", contactId)
      return error ? "falhou" : "sem_foto"
    }

    const caminho = caminhoDaFoto(workspaceId, contactId)
    const { error: erroUpload } = await svc.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, foto.corpo, { contentType: foto.mimeType, upsert: true })
    if (erroUpload) return "falhou"

    const { error } = await svc.from("contacts").update({ photo_path: caminho, photo_checked_at: agora }).eq("id", contactId)
    if (error) return "falhou"

    const url = await urlAssinadaDaFoto(svc, caminho)
    if (url) await transmitirContatoFoto(workspaceId, contactId, url).catch(() => undefined)
    return "guardada"
  } catch (erro) {
    console.error("[foto-de-perfil] busca falhou; tenta de novo na próxima mensagem", erro instanceof Error ? erro.message : erro)
    return "falhou"
  }
}

/** Endereço temporário de uma foto guardada, para a tela. Null se falhar. */
export async function urlAssinadaDaFoto(svc: ServiceClient, caminho: string): Promise<string | null> {
  const { data } = await svc.storage.from(BUCKET_FOTOS).createSignedUrl(caminho, VALIDADE_URL_FOTO_SEGUNDOS)
  return data?.signedUrl ?? null
}

/** Endereços temporários de várias fotos de uma vez (a lista do chat). */
export async function urlsAssinadasDasFotos(svc: ServiceClient, caminhos: string[]): Promise<Map<string, string>> {
  const unicos = Array.from(new Set(caminhos.filter(Boolean)))
  if (unicos.length === 0) return new Map()
  const { data } = await svc.storage.from(BUCKET_FOTOS).createSignedUrls(unicos, VALIDADE_URL_FOTO_SEGUNDOS)
  const mapa = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl)
  }
  return mapa
}

/** Apagar de vez (lixeira, B13-06): a cópia da foto vai junto. Nunca lança. */
export async function apagarFotoDoContato(svc: ServiceClient, workspaceId: string, contactId: string): Promise<void> {
  await svc.storage.from(BUCKET_FOTOS).remove([caminhoDaFoto(workspaceId, contactId)]).catch(() => undefined)
}
