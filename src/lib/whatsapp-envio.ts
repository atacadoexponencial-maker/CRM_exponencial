// Envio de mensagem WhatsApp pelo backend (service client), usado pelo motor de
// automações e pelo motor de sequências. Registra a mensagem na conversa aberta
// do contato (cria uma se não existir) ou, quando quem chama tem uma conversa em
// mão, nela. As automações também mandam imagem e documento (B11-07).

import type { createServiceClient } from "@/integrations/supabase/service"
import { resolverProviderDaConversa, resolverProviderDoContato } from "@/lib/whatsapp"

type ServiceClient = ReturnType<typeof createServiceClient>

export async function buscarConversaAberta(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .in("status", ["em_espera", "em_atendimento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id ?? null
}

export async function enviarTextoWhatsApp(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  texto: string
): Promise<boolean> {
  return (await enviarTextoWhatsAppComMotivo(supabase, workspaceId, contactId, texto)).ok
}

/**
 * O mesmo envio, devolvendo o motivo da falha em português. As automações usam
 * esta, para o histórico dizer por que a mensagem não saiu (B11-03).
 */
export async function enviarTextoWhatsAppComMotivo(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  texto: string
): Promise<ResultadoDoEnvio> {
  return enviarWhatsAppComMotivo(supabase, workspaceId, contactId, { tipo: "texto", texto })
}

/** Texto, ou imagem e documento já guardados no armazenamento (B11-07). */
export type ConteudoDoEnvio =
  | { tipo: "texto"; texto: string }
  | { tipo: "imagem" | "documento"; url: string; nomeArquivo: string }

export type ResultadoDoEnvio = { ok: true } | { ok: false; motivo: string }

/** O que aparece na lista de conversas depois do envio. */
const PREVIA_DA_MIDIA = { imagem: "📷 Imagem", documento: "📄 Documento" } as const

/**
 * Envia e grava a mensagem enviada. Com `conversaId` (B11-07), sai pelo número
 * daquela conversa e fica gravada nela: é a resposta a uma mensagem que o
 * cliente mandou para um número específico. Sem ela, sai pelo número da
 * conversa aberta do contato (B7-01), e a conversa nasce se não houver.
 */
export async function enviarWhatsAppComMotivo(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  conteudo: ConteudoDoEnvio,
  conversaId: string | null = null
): Promise<ResultadoDoEnvio> {
  // B7-01: o número é o da conversa, e não "um do workspace". Automações e
  // sequências agem sobre o contato: sem conversa em mão, a resolução é por ele.
  const [provider, { data: contato }] = await Promise.all([
    conversaId
      ? resolverProviderDaConversa(supabase, conversaId, workspaceId)
      : resolverProviderDoContato(supabase, workspaceId, contactId),
    supabase.from("contacts").select("phone_number").eq("id", contactId).single(),
  ])

  if (!provider) return { ok: false, motivo: "Nenhum número de WhatsApp conectado" }
  if (!contato) return { ok: false, motivo: "Contato não encontrado" }
  if (conteudo.tipo !== "texto" && !provider.suporta("midia")) {
    return { ok: false, motivo: "O número desta conversa não envia imagem nem documento" }
  }

  const resultado =
    conteudo.tipo === "texto"
      ? await provider.enviarTexto(contato.phone_number, conteudo.texto)
      : await provider.enviarMidia(contato.phone_number, {
          url: conteudo.url,
          tipo: conteudo.tipo,
          nomeArquivo: conteudo.nomeArquivo,
        })

  if (!resultado.ok) return { ok: false, motivo: `O WhatsApp recusou o envio: ${resultado.motivo}` }

  const wamid = resultado.mensagemId
  const agora = new Date().toISOString()
  const previa = conteudo.tipo === "texto" ? conteudo.texto : PREVIA_DA_MIDIA[conteudo.tipo]

  let conversaDoEnvio = conversaId ?? (await buscarConversaAberta(supabase, workspaceId, contactId))

  if (!conversaDoEnvio) {
    // B7-01: a conversa nasce com o número por onde a mensagem saiu, para a
    // resposta do cliente ser respondida pelo mesmo telefone.
    const { data: conexao } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle()

    const { data: nova } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        status: "em_espera",
        assigned_to: null,
        unread_count: 0,
        last_message_text: previa,
        last_message_at: agora,
        whatsapp_connection_id: conexao?.id ?? null,
      })
      .select("id")
      .single()
    conversaDoEnvio = nova?.id ?? null
  }

  if (!conversaDoEnvio) return { ok: true } // mensagem saiu, só não foi registrada em conversa

  await supabase.from("messages").insert({
    conversation_id: conversaDoEnvio,
    workspace_id: workspaceId,
    direction: "enviada",
    type: conteudo.tipo,
    // Na mídia, o endereço do arquivo, como o chat grava
    content: conteudo.tipo === "texto" ? conteudo.texto : conteudo.url,
    media_filename: conteudo.tipo === "documento" ? conteudo.nomeArquivo : null,
    status: "enviado",
    wamid,
    created_at: agora,
  })

  await supabase
    .from("conversations")
    .update({ last_message_text: previa, last_message_at: agora })
    .eq("id", conversaDoEnvio)

  return { ok: true }
}
