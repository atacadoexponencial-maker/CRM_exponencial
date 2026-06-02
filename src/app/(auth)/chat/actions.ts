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

  const metaData = await metaRes.json() as { messages?: Array<{ id: string }> }
  const wamid = metaData.messages?.[0]?.id ?? null

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "texto",
    content: texto,
    status: "enviado",
    wamid,
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

  if (!metaRes.ok) {
    const errBody = await metaRes.text().catch(() => "")
    throw new Error(`Meta API error: ${metaRes.status} - ${errBody}`)
  }

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

export async function enviarAudio(conversaId: string, formData: FormData): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const arquivo = formData.get("arquivo") as File
  if (!arquivo || !arquivo.type.startsWith("audio/")) throw new Error("Arquivo inválido")
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
  const ext = arquivo.type.includes("ogg") ? "ogg" : arquivo.type.includes("mp4") ? "mp4" : arquivo.type.includes("mpeg") ? "mp3" : "webm"
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
        type: "audio",
        audio: { link: publicUrl },
      }),
    }
  )

  if (!metaRes.ok) {
    const errBody = await metaRes.text().catch(() => "")
    throw new Error(`Meta API error: ${metaRes.status} - ${errBody}`)
  }

  const agora = new Date().toISOString()

  const { error: errMsg } = await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id,
    direction: "enviada",
    type: "audio",
    content: publicUrl,
    status: "enviado",
    created_at: agora,
  })

  if (errMsg) throw new Error(errMsg.message)

  await supabase
    .from("conversations")
    .update({ last_message_text: "🎤 Áudio", last_message_at: agora })
    .eq("id", conversaId)
}

export async function buscarAtendentes(workspaceId: string): Promise<Array<{ id: string; nome: string }>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => ({ id: p.id, nome: p.name ?? "" }))
}

export async function atribuirConversa(conversaId: string, atendenteId: string): Promise<{ nomeAtribuido: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!perfil || perfil.role === "atendente") throw new Error("Sem permissão para atribuir conversas")

  const { data: atendente } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", atendenteId)
    .single()

  if (!atendente) throw new Error("Atendente não encontrado")

  const { error } = await supabase
    .from("conversations")
    .update({ assigned_to: atendenteId, status: "em_atendimento" })
    .eq("id", conversaId)

  if (error) throw new Error(error.message)

  return { nomeAtribuido: atendente.name ?? "" }
}

export async function transferirConversa(conversaId: string, atendenteId: string): Promise<{ nomeAtribuido: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!perfil) throw new Error("Não autorizado")

  if (perfil.role === "atendente") {
    const { data: timesUsuario } = await supabase
      .from("user_teams")
      .select("team_id")
      .eq("user_id", user.id)

    const teamIds = (timesUsuario ?? []).map((r) => r.team_id)

    if (teamIds.length === 0) throw new Error("Sem permissão para transferir conversa")

    const { data: membroTime } = await supabase
      .from("user_teams")
      .select("user_id")
      .in("team_id", teamIds)
      .eq("user_id", atendenteId)
      .limit(1)
      .maybeSingle()

    if (!membroTime) throw new Error("Sem permissão para transferir para este atendente")
  }

  const { data: atendente } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", atendenteId)
    .single()

  if (!atendente) throw new Error("Atendente não encontrado")

  const { error } = await supabase
    .from("conversations")
    .update({ assigned_to: atendenteId })
    .eq("id", conversaId)

  if (error) throw new Error(error.message)

  return { nomeAtribuido: atendente.name ?? "" }
}

export async function resolverConversa(conversaId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { error } = await supabase
    .from("conversations")
    .update({ status: "resolvida" })
    .eq("id", conversaId)

  if (error) throw new Error(error.message)
}

export async function reabrirConversa(conversaId: string): Promise<{ novoStatus: "em_atendimento" | "em_espera" }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { data: conversa } = await supabase
    .from("conversations")
    .select("assigned_to")
    .eq("id", conversaId)
    .single()

  if (!conversa) throw new Error("Conversa não encontrada")

  const novoStatus: "em_atendimento" | "em_espera" = conversa.assigned_to ? "em_atendimento" : "em_espera"

  const { error } = await supabase
    .from("conversations")
    .update({ status: novoStatus })
    .eq("id", conversaId)

  if (error) throw new Error(error.message)

  return { novoStatus }
}

export interface ConversaAnterior {
  id: string
  status: string
  ultimaMensagemTexto: string
  ultimaMensagemHorario: string
}

export interface InfoContato {
  dataPrimeiroContato: string
  etiquetas: []
  conversasAnteriores: ConversaAnterior[]
}

export async function buscarInfoContato(conversaId: string): Promise<InfoContato> {
  const supabase = await createClient()

  const { data: conversa, error: errConversa } = await supabase
    .from("conversations")
    .select("contact_id, contact:contacts(created_at)")
    .eq("id", conversaId)
    .single()

  if (errConversa || !conversa) throw new Error("Conversa não encontrada")

  type ConversaRow = { contact_id: string; contact: { created_at: string } | null }
  const { contact_id, contact } = conversa as unknown as ConversaRow

  if (!contact) throw new Error("Contato não encontrado")

  const dataPrimeiroContato = new Date(contact.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  const { data: anteriores } = await supabase
    .from("conversations")
    .select("id, status, last_message_text, last_message_at")
    .eq("contact_id", contact_id)
    .neq("id", conversaId)
    .order("last_message_at", { ascending: false })

  function formatarData(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Ontem"
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    if (diffDays < 7) return weekdays[date.getDay()]
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  }

  const conversasAnteriores: ConversaAnterior[] = (anteriores ?? []).map((c) => ({
    id: c.id,
    status: c.status,
    ultimaMensagemTexto: c.last_message_text,
    ultimaMensagemHorario: formatarData(c.last_message_at),
  }))

  return { dataPrimeiroContato, etiquetas: [], conversasAnteriores }
}

export async function atualizarNomeContato(contactId: string, nome: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { error } = await supabase
    .from("contacts")
    .update({ name: nome })
    .eq("id", contactId)

  if (error) throw new Error(error.message)
}

export async function marcarComoLidas(conversaId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  await supabase
    .from("conversations")
    .update({ unread_count: 0 })
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

export type EtiquetaWorkspace = {
  id: string
  nome: string
  cor: string
}

export async function listarEtiquetasWorkspace(): Promise<EtiquetaWorkspace[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: perfil } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!perfil) return []

  const { data } = await supabase
    .from("labels")
    .select("id, name, color")
    .eq("workspace_id", perfil.workspace_id)
    .order("name")

  if (!data) return []

  return data.map((l) => ({ id: l.id, nome: l.name, cor: l.color }))
}

export async function aplicarEtiqueta(
  conversaId: string,
  labelId: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { error } = await supabase
    .from("conversation_labels")
    .insert({ conversation_id: conversaId, label_id: labelId })

  if (error) return { erro: "Não foi possível aplicar a etiqueta." }

  return {}
}

export async function removerEtiqueta(
  conversaId: string,
  labelId: string
): Promise<{ erro?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: "Não autorizado" }

  const { error } = await supabase
    .from("conversation_labels")
    .delete()
    .eq("conversation_id", conversaId)
    .eq("label_id", labelId)

  if (error) return { erro: "Não foi possível remover a etiqueta." }

  return {}
}
