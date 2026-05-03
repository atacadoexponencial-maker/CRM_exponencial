"use server"

import { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Mensagem, TipoMensagem, DirecaoMensagem, StatusMensagem } from "./mock-mensagens"

export async function enviarMensagem(conversaId: string, texto: string): Promise<void> {
  const supabase = await createClient()

  const { data: conversa, error: errConversa } = await supabase
    .from("conversations")
    .select("workspace_id, contact:contacts(phone_number)")
    .eq("id", conversaId)
    .single()

  if (errConversa || !conversa) throw new Error("Conversa não encontrada")

  type ConversaRow = { workspace_id: string; contact: { phone_number: string } | null }
  const { workspace_id, contact } = conversa as unknown as ConversaRow
  if (!contact) throw new Error("Contato não encontrado")

  const { data: conn, error: errConn } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspace_id)
    .eq("status", "connected")
    .limit(1)
    .single()

  if (errConn || !conn) throw new Error("Conexão WhatsApp não encontrada")

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: contact.phone_number,
        type: "text",
        text: { body: texto },
      }),
    }
  )

  if (!metaRes.ok) throw new Error(`Meta API error: ${metaRes.status}`)

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "texto",
    content: texto,
    status: "enviado",
    created_at: agora,
  })

  if (errMsg) throw new Error(errMsg.message)

  await supabase
    .from("conversations")
    .update({ last_message_text: texto, last_message_at: agora })
    .eq("id", conversaId)
}

export async function enviarImagem(conversaId: string, formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const arquivo = formData.get("arquivo") as File
  if (!arquivo || !arquivo.type.startsWith("image/")) throw new Error("Arquivo inválido")
  if (arquivo.size > 5 * 1024 * 1024) throw new Error("Arquivo muito grande (máximo 5 MB)")

  const { data: conversa, error: errConversa } = await supabase
    .from("conversations")
    .select("workspace_id, contact:contacts(phone_number)")
    .eq("id", conversaId)
    .single()

  if (errConversa || !conversa) throw new Error("Conversa não encontrada")

  type ConversaRow = { workspace_id: string; contact: { phone_number: string } | null }
  const { workspace_id, contact } = conversa as unknown as ConversaRow
  if (!contact) throw new Error("Contato não encontrado")

  const { data: conn, error: errConn } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspace_id)
    .eq("status", "connected")
    .limit(1)
    .single()

  if (errConn || !conn) throw new Error("Conexão WhatsApp não encontrada")

  const serviceClient = createServiceClient()
  const ext = arquivo.name.split(".").pop() ?? "jpg"
  const path = `${workspace_id}/${conversaId}/${Date.now()}.${ext}`

  const { error: errUpload } = await serviceClient.storage
    .from("chat-attachments")
    .upload(path, arquivo, { contentType: arquivo.type })

  if (errUpload) throw new Error(`Erro no upload: ${errUpload.message}`)

  const { data: { publicUrl } } = serviceClient.storage
    .from("chat-attachments")
    .getPublicUrl(path)

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: contact.phone_number,
        type: "image",
        image: { link: publicUrl },
      }),
    }
  )

  if (!metaRes.ok) throw new Error(`Meta API error: ${metaRes.status}`)

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "imagem",
    content: publicUrl,
    status: "enviado",
    created_at: agora,
  })

  if (errMsg) throw new Error(errMsg.message)

  await supabase
    .from("conversations")
    .update({ last_message_text: "📷 Imagem", last_message_at: agora })
    .eq("id", conversaId)
}

const TIPOS_DOCUMENTO_VALIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]

export async function enviarDocumento(conversaId: string, formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const arquivo = formData.get("arquivo") as File
  if (!arquivo || !TIPOS_DOCUMENTO_VALIDOS.includes(arquivo.type)) throw new Error("Tipo de arquivo inválido")
  if (arquivo.size > 100 * 1024 * 1024) throw new Error("Arquivo muito grande (máximo 100 MB)")

  const { data: conversa, error: errConversa } = await supabase
    .from("conversations")
    .select("workspace_id, contact:contacts(phone_number)")
    .eq("id", conversaId)
    .single()

  if (errConversa || !conversa) throw new Error("Conversa não encontrada")

  type ConversaRow = { workspace_id: string; contact: { phone_number: string } | null }
  const { workspace_id, contact } = conversa as unknown as ConversaRow
  if (!contact) throw new Error("Contato não encontrado")

  const { data: conn, error: errConn } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspace_id)
    .eq("status", "connected")
    .limit(1)
    .single()

  if (errConn || !conn) throw new Error("Conexão WhatsApp não encontrada")

  const serviceClient = createServiceClient()
  const nomeArquivoSanitizado = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${workspace_id}/${conversaId}/${Date.now()}-${nomeArquivoSanitizado}`

  const { error: errUpload } = await serviceClient.storage
    .from("chat-attachments")
    .upload(path, arquivo, { contentType: arquivo.type })

  if (errUpload) throw new Error(`Erro no upload: ${errUpload.message}`)

  const { data: { publicUrl } } = serviceClient.storage
    .from("chat-attachments")
    .getPublicUrl(path)

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: contact.phone_number,
        type: "document",
        document: { link: publicUrl, filename: arquivo.name },
      }),
    }
  )

  if (!metaRes.ok) throw new Error(`Meta API error: ${metaRes.status}`)

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "documento",
    content: publicUrl,
    status: "enviado",
    created_at: agora,
  })

  if (errMsg) throw new Error(errMsg.message)

  await supabase
    .from("conversations")
    .update({ last_message_text: "📄 Documento", last_message_at: agora })
    .eq("id", conversaId)
}

export async function enviarVideo(conversaId: string, formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const arquivo = formData.get("arquivo") as File
  if (!arquivo || !["video/mp4", "video/3gpp"].includes(arquivo.type)) throw new Error("Tipo de arquivo inválido")
  if (arquivo.size > 16 * 1024 * 1024) throw new Error("Arquivo muito grande (máximo 16 MB)")

  const { data: conversa, error: errConversa } = await supabase
    .from("conversations")
    .select("workspace_id, contact:contacts(phone_number)")
    .eq("id", conversaId)
    .single()

  if (errConversa || !conversa) throw new Error("Conversa não encontrada")

  type ConversaRow = { workspace_id: string; contact: { phone_number: string } | null }
  const { workspace_id, contact } = conversa as unknown as ConversaRow
  if (!contact) throw new Error("Contato não encontrado")

  const { data: conn, error: errConn } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id, access_token")
    .eq("workspace_id", workspace_id)
    .eq("status", "connected")
    .limit(1)
    .single()

  if (errConn || !conn) throw new Error("Conexão WhatsApp não encontrada")

  const serviceClient = createServiceClient()
  const ext = arquivo.name.split(".").pop() ?? "mp4"
  const path = `${workspace_id}/${conversaId}/${Date.now()}.${ext}`

  const { error: errUpload } = await serviceClient.storage
    .from("chat-attachments")
    .upload(path, arquivo, { contentType: arquivo.type })

  if (errUpload) throw new Error(`Erro no upload: ${errUpload.message}`)

  const { data: { publicUrl } } = serviceClient.storage
    .from("chat-attachments")
    .getPublicUrl(path)

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${conn.phone_number_id}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${conn.access_token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: contact.phone_number,
        type: "video",
        video: { link: publicUrl },
      }),
    }
  )

  if (!metaRes.ok) throw new Error(`Meta API error: ${metaRes.status}`)

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "video",
    content: publicUrl,
    status: "enviado",
    created_at: agora,
  })

  if (errMsg) throw new Error(errMsg.message)

  await supabase
    .from("conversations")
    .update({ last_message_text: "🎥 Vídeo", last_message_at: agora })
    .eq("id", conversaId)
}

export async function buscarMensagens(conversaId: string): Promise<Mensagem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, direction, type, content, status, reply_to_id, reply_preview_text, created_at")
    .eq("conversation_id", conversaId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const horario = new Date(row.created_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const mensagem: Mensagem = {
      id: row.id,
      conversaId: row.conversation_id,
      tipo: row.type as TipoMensagem,
      direcao: row.direction as DirecaoMensagem,
      conteudo: row.content,
      horario,
      status: (row.status ?? undefined) as StatusMensagem | undefined,
    }

    if (row.reply_to_id && row.reply_preview_text) {
      mensagem.replyDe = { id: row.reply_to_id, texto: row.reply_preview_text }
    }

    return mensagem
  })
}
