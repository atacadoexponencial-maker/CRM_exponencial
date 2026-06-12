import { createHmac, timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { processarAutomacoes } from "@/lib/automacoes"

// Valida a assinatura X-Hub-Signature-256 que a Meta envia em todo webhook.
// Sem META_APP_SECRET configurado (ex.: ambiente de teste) a validação é pulada.
function assinaturaValida(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return true
  if (!signature) return false

  const esperada = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex")
  const a = Buffer.from(esperada)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) return NextResponse.json({ error: "not configured" }, { status: 403 })

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!assinaturaValida(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  type WebhookValue = {
    metadata?: { phone_number_id?: string }
    statuses?: Array<{ status: string; id?: string }>
    messages?: Array<{ from: string; id: string; timestamp: string; text?: { body?: string } }>
  }
  type WebhookBody = { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> }

  let body: WebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 })
  }

  const change = body?.entry?.[0]?.changes?.[0]?.value
  const phoneNumberId = change?.metadata?.phone_number_id
  if (!phoneNumberId) return NextResponse.json({ status: "ok" })

  const supabase = createServiceClient()

  const statuses = change?.statuses
  if (Array.isArray(statuses) && statuses.length > 0) {
    const statusMap: Record<string, string> = {
      delivered: "entregue",
      read: "lido",
      failed: "falhou",
    }
    for (const s of statuses) {
      const novoStatus = statusMap[s.status]
      if (!novoStatus || !s.id) continue
      await supabase.from("messages").update({ status: novoStatus }).eq("wamid", s.id)
      // Campanhas usam os mesmos eventos para o relatório de entrega
      await supabase
        .from("campaign_recipients")
        .update({ status: novoStatus === "falhou" ? "falhou" : novoStatus, atualizado_em: new Date().toISOString() })
        .eq("wamid", s.id)
    }
    return NextResponse.json({ status: "ok" })
  }

  const messages = change?.messages
  if (!messages?.length) return NextResponse.json({ status: "ok" })

  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("workspace_id")
    .eq("phone_number_id", phoneNumberId)
    .single()

  if (!connection) return NextResponse.json({ status: "ok" })

  const { workspace_id } = connection

  for (const message of messages) {
    const phoneNumber: string = message.from
    const messageText: string = message.text?.body ?? ""
    const messageAt = new Date(Number(message.timestamp) * 1000).toISOString()

    let { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("phone_number", phoneNumber)
      .single()

    if (!contact) {
      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({ workspace_id, phone_number: phoneNumber })
        .select("id")
        .single()
      if (error || !newContact) return NextResponse.json({ error: "db error" }, { status: 500 })
      contact = newContact
    }

    const { data: openConversation } = await supabase
      .from("conversations")
      .select("id, unread_count")
      .eq("workspace_id", workspace_id)
      .eq("contact_id", contact.id)
      .in("status", ["em_espera", "em_atendimento"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    let conversaId: string

    if (openConversation) {
      const { error } = await supabase
        .from("conversations")
        .update({
          last_message_text: messageText,
          last_message_at: messageAt,
          unread_count: openConversation.unread_count + 1,
        })
        .eq("id", openConversation.id)
      if (error) return NextResponse.json({ error: "db error" }, { status: 500 })
      conversaId = openConversation.id
    } else {
      const { data: novaConversa, error } = await supabase.from("conversations").insert({
        workspace_id,
        contact_id: contact.id,
        status: "em_espera",
        assigned_to: null,
        unread_count: 1,
        last_message_text: messageText,
        last_message_at: messageAt,
      }).select("id").single()
      if (error || !novaConversa) return NextResponse.json({ error: "db error" }, { status: 500 })
      conversaId = novaConversa.id

      await processarAutomacoes({
        tipo: "conversa_criada",
        workspaceId: workspace_id,
        contactId: contact.id,
        conversationId: conversaId,
      })
    }

    const { data: msgInserida } = await supabase.from("messages").insert({
      conversation_id: conversaId,
      workspace_id,
      direction: "recebida",
      type: "texto",
      content: messageText,
      wamid: message.id,
      created_at: messageAt,
    }).select("id").single()

    if (msgInserida) {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{
            topic: `workspace:${workspace_id}`,
            event: "nova_mensagem",
            payload: {
              id: msgInserida.id,
              conversation_id: conversaId,
              workspace_id,
              direction: "recebida",
              type: "texto",
              content: messageText,
              created_at: messageAt,
              status: null,
            },
          }],
        }),
      })
    }
  }

  return NextResponse.json({ status: "ok" })
}
