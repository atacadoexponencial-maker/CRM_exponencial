"use server"

import { createClient } from "@/integrations/supabase/server"
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
