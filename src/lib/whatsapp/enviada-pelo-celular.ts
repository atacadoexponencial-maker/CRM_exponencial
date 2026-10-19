// Mensagem que o vendedor mandou pelo celular, no canal direto (B25-02).
//
// O vendedor continua com o WhatsApp no aparelho. O que ele manda por lá (ou pelo
// WhatsApp Web) sai do número conectado sem passar pelo CRM, e o gateway avisa
// com `message.sent_from_phone` (seção 3.5 do contrato). Aqui o aviso vira uma
// mensagem do lado da empresa, na conversa do contato, marcada com
// `sent_from_phone` — é o que põe "Enviada pelo celular" no balão.
//
// O caminho é o do recebimento (B6-02/B6-03): mesmo contato, mesma mídia, mesma
// transmissão em tempo real. O que muda é a conversa:
//
//  - não soma "não lidas" — quem escreveu foi a empresa;
//  - conversa resolvida é reaberta, em vez de abrir outra (PER-B25-03);
//  - conversa nova não dispara "conversa criada" (SUP-B25-06);
//  - vale como resposta do time (B25-03): dispara "mensagem enviada pelo time",
//    como o envio pelo chat. Alertas já contam pela prévia da conversa.

import type { createServiceClient } from "@/integrations/supabase/service"
import { tipoDaMensagemParaRegras } from "@/lib/automacoes/contexto"
import { dispararMensagemEnviadaPeloTime } from "@/lib/automacoes/gatilhos-do-crm"
import {
  acharMensagemPorWamid,
  acharOuCriarContato,
  escolherConversaDoNumero,
  identificadorDoContato,
  TIPOS_COM_ARQUIVO,
  traduzirConteudo,
  type EventoMensagemRecebida,
} from "./recebimento"
import { guardarMidiaRecebida, type MidiaDoEvento } from "./midia-recebida"
import { transmitirMensagem } from "./realtime"

type ServiceClient = ReturnType<typeof createServiceClient>

/** `data` de `message.sent_from_phone` (contrato, seção 3.5). */
export type EventoMensagemEnviadaPeloCelular = {
  message_id: string
  /** O próprio número conectado. */
  from?: string
  /** O contato: o outro lado da conversa. */
  to: string
  to_is_lid?: boolean
  type: string
  text?: string | null
  media?: MidiaDoEvento | null
  location?: EventoMensagemRecebida["location"]
  contact?: EventoMensagemRecebida["contact"]
  reply_to?: EventoMensagemRecebida["reply_to"]
  timestamp?: string
}

export type ResultadoDaEnviadaPeloCelular = {
  contactId: string
  conversationId: string
  messageId: string | null
  conversaCriada: boolean
  conversaReaberta: boolean
}

/**
 * O aviso no formato da mensagem recebida, com o contato no lugar do remetente.
 * É o que deixa reaproveitar a tradução de conteúdo e o identificador do
 * contato sem duplicá-los.
 */
function comoRecebida(evento: EventoMensagemEnviadaPeloCelular): EventoMensagemRecebida {
  return {
    message_id: evento.message_id,
    from: evento.to,
    from_is_lid: evento.to_is_lid ?? false,
    type: evento.type,
    text: evento.text ?? null,
    media: evento.media ?? null,
    location: evento.location ?? null,
    contact: evento.contact ?? null,
    reply_to: evento.reply_to ?? null,
  }
}

type ConversaDoContato = {
  id: string
  status: string
  assigned_to: string | null
  unread_count: number
  whatsapp_connection_id: string | null
}

/**
 * A conversa que recebe a mensagem: a aberta do mesmo número; senão a resolvida
 * mais recente do mesmo número, que é reaberta; senão nenhuma (o chamador abre
 * uma nova). Mesma regra de número dono do recebimento.
 */
async function abrirReabrirOuReusarConversa({
  supabase,
  workspaceId,
  contactId,
  previa,
  enviadaEm,
  connectionId,
}: {
  supabase: ServiceClient
  workspaceId: string
  contactId: string
  previa: string
  enviadaEm: string
  connectionId: string | null
}): Promise<{ conversationId: string; conversaCriada: boolean; conversaReaberta: boolean }> {
  const { data } = await supabase
    .from("conversations")
    .select("id, status, assigned_to, unread_count, whatsapp_connection_id")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .in("status", ["em_espera", "em_atendimento", "resolvida"])
    .order("created_at", { ascending: false })
    .limit(50)

  const conversas = (data ?? []) as ConversaDoContato[]
  const abertas = conversas.filter((c) => c.status !== "resolvida")
  const resolvidas = conversas.filter((c) => c.status === "resolvida")

  const aberta = escolherConversaDoNumero(abertas, connectionId)
  const resolvida = aberta ? null : escolherConversaDoNumero(resolvidas, connectionId)
  const existente = aberta ?? resolvida

  if (existente) {
    const { error } = await supabase
      .from("conversations")
      .update({
        last_message_text: previa,
        last_message_at: enviadaEm,
        // Não lidas ficam como estão: quem escreveu foi a empresa.
        whatsapp_connection_id: existente.whatsapp_connection_id ?? connectionId,
        // Mesma regra do botão "Reabrir" (SUP-B25-07).
        ...(resolvida ? { status: resolvida.assigned_to ? "em_atendimento" : "em_espera" } : {}),
      })
      .eq("id", existente.id)

    if (error) throw new Error(`Não foi possível atualizar a conversa: ${error.message}`)
    return { conversationId: existente.id, conversaCriada: false, conversaReaberta: Boolean(resolvida) }
  }

  const { data: nova, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      status: "em_espera",
      assigned_to: null,
      unread_count: 0,
      last_message_text: previa,
      last_message_at: enviadaEm,
      whatsapp_connection_id: connectionId,
    })
    .select("id")
    .single()

  if (error || !nova) {
    throw new Error(`Não foi possível abrir a conversa: ${error?.message ?? "sem detalhe"}`)
  }
  return { conversationId: nova.id, conversaCriada: true, conversaReaberta: false }
}

/**
 * Registra a mensagem enviada pelo celular. Lança se o banco falhar em algo
 * essencial: a rota responde não-2xx e o gateway reentrega, como no recebimento.
 *
 * Reentrega de tentativa que morreu no meio esbarra no `wamid` único: o insert
 * falha, e nada é transmitido de novo.
 */
export async function registrarEnviadaPeloCelular({
  supabase,
  workspaceId,
  evento,
  enviadaEm,
  instanceToken = null,
  connectionId = null,
}: {
  supabase: ServiceClient
  workspaceId: string
  evento: EventoMensagemEnviadaPeloCelular
  /** Momento do fato (`timestamp` do envelope). */
  enviadaEm: string
  /** Credencial da instância dona, para baixar a mídia. Só backend. */
  instanceToken?: string | null
  /** Conexão dona da instância: a conversa é a deste número. */
  connectionId?: string | null
}): Promise<ResultadoDaEnviadaPeloCelular> {
  const comoEvento = comoRecebida(evento)

  // Sem nome: o WhatsApp não manda o nome do destinatário (SUP-B25-05). O nome
  // entra quando o contato responder.
  const contactId = await acharOuCriarContato(supabase, workspaceId, identificadorDoContato(comoEvento), null)

  const midia =
    comoEvento.media && TIPOS_COM_ARQUIVO.includes(comoEvento.type)
      ? await guardarMidiaRecebida({ supabase, workspaceId, midia: comoEvento.media, instanceToken })
      : null
  const traduzido = traduzirConteudo(comoEvento, midia)

  const { conversationId, conversaCriada, conversaReaberta } = await abrirReabrirOuReusarConversa({
    supabase,
    workspaceId,
    contactId,
    previa: traduzido.previa,
    enviadaEm,
    connectionId,
  })

  const respondendo = await acharMensagemPorWamid(supabase, evento.reply_to?.message_id)

  const { data: inserida } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      workspace_id: workspaceId,
      direction: "enviada",
      type: traduzido.tipo,
      content: traduzido.conteudo,
      // Já saiu pelo WhatsApp quando o aviso chega.
      status: "enviado",
      sent_from_phone: true,
      wamid: evento.message_id,
      created_at: enviadaEm,
      reply_to_id: respondendo,
      reply_preview_text: evento.reply_to?.preview_text ?? null,
      media_mime_type: midia?.mimeType ?? null,
      media_filename: midia?.filename ?? null,
      media_caption: TIPOS_COM_ARQUIVO.includes(evento.type) ? evento.text ?? null : null,
    })
    .select("id")
    .single()

  if (inserida) {
    await transmitirMensagem({
      id: inserida.id,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      direction: "enviada",
      type: traduzido.tipo,
      content: traduzido.conteudo,
      created_at: enviadaEm,
      status: "enviado",
      sent_from_phone: true,
    })

    // B25-03: só a mensagem gravada dispara; na reentrega o insert falha e as
    // regras não rodam duas vezes. Como no chat, só a de texto leva texto.
    const texto = traduzido.tipo === "texto" || traduzido.tipo === "desconhecido" ? evento.text ?? "" : ""
    await dispararMensagemEnviadaPeloTime({
      workspaceId,
      contactId,
      conversationId,
      messageId: inserida.id,
      tipoMensagem: tipoDaMensagemParaRegras(traduzido.tipo, texto),
      texto,
    })
  }

  return { contactId, conversationId, messageId: inserida?.id ?? null, conversaCriada, conversaReaberta }
}
