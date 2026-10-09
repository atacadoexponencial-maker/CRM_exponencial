import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { tipoDaMensagemParaRegras } from "@/lib/automacoes/contexto"
import { dispararAutomacoes } from "@/lib/automacoes/fila"
import { assinaturaHmacValida } from "@/lib/webhooks/assinatura"
import { transmitirMensagem } from "@/lib/whatsapp/realtime"
import { TIPO_NO_CRM, escolherConversaDoNumero } from "@/lib/whatsapp/recebimento"
import { tirarDaLixeira } from "@/lib/lixeira"

// Valida a assinatura X-Hub-Signature-256 que a Meta envia em todo webhook.
// B21-06: sem META_APP_SECRET configurado, recusa (antes, a validação era pulada e
// qualquer um gravava mensagens falsas) — como no webhook do gateway.
//
// O HMAC em si mora em @/lib/webhooks/assinatura (B6-01), compartilhado com o
// webhook do gateway.
function assinaturaValida(rawBody: string, signature: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET
  if (!appSecret) return false

  return assinaturaHmacValida({ corpoBruto: rawBody, assinatura: signature, segredo: appSecret })
}

/** Tipos da Meta que não são o cliente escrevendo: reação e aviso de sistema (troca de número). */
const TIPOS_QUE_NAO_DISPARAM = ["reaction", "system"]

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
    messages?: Array<{ from: string; id: string; timestamp: string; type?: string; text?: { body?: string } }>
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
    // B7-01: o `id` entrou junto do workspace para a conversa nascer sabendo
    // por qual número ela chegou. Nada mais mudou neste arquivo.
    .select("id, workspace_id")
    .eq("phone_number_id", phoneNumberId)
    .single()

  if (!connection) return NextResponse.json({ status: "ok" })

  const { id: connectionId, workspace_id } = connection

  for (const message of messages) {
    const phoneNumber: string = message.from
    const messageText: string = message.text?.body ?? ""
    const messageAt = new Date(Number(message.timestamp) * 1000).toISOString()

    let { data: contact } = await supabase
      .from("contacts")
      .select("id, excluido_em")
      .eq("workspace_id", workspace_id)
      .eq("phone_number", phoneNumber)
      .single()

    // B13-05: cliente na lixeira que escreve sai dela, com o histórico. Se falhar,
    // a mensagem é gravada mesmo assim (fica escondida até restaurarem).
    if (contact?.excluido_em) {
      await tirarDaLixeira(supabase, workspace_id, contact.id).catch(() => {})
    }

    if (!contact) {
      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({ workspace_id, phone_number: phoneNumber })
        .select("id, excluido_em")
        .single()
      if (error || !newContact) return NextResponse.json({ error: "db error" }, { status: 500 })
      contact = newContact
    }

    // A caixa é por NÚMERO DONO, e não só por contato: o mesmo cliente que
    // escreve para dois números do workspace tem duas conversas. Sem isto, a
    // segunda mensagem caía na caixa do primeiro número e a resposta saía pelo
    // telefone errado. A escolha é a mesma do gateway, e mora lá.
    const { data: abertas } = await supabase
      .from("conversations")
      .select("id, unread_count, whatsapp_connection_id")
      .eq("workspace_id", workspace_id)
      .eq("contact_id", contact.id)
      .in("status", ["em_espera", "em_atendimento"])
      .order("created_at", { ascending: false })
      .limit(50)

    const openConversation = escolherConversaDoNumero(abertas ?? [], connectionId ?? null)

    let conversaId: string

    if (openConversation) {
      const { error } = await supabase
        .from("conversations")
        .update({
          last_message_text: messageText,
          last_message_at: messageAt,
          unread_count: openConversation.unread_count + 1,
          // Conversa sem dono registrado adota o número por onde a mensagem
          // chegou, em vez de virar caixa duplicada.
          whatsapp_connection_id: openConversation.whatsapp_connection_id ?? connectionId ?? null,
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
        // B7-01: a resposta a esta conversa sai por este mesmo número.
        whatsapp_connection_id: connectionId,
      }).select("id").single()
      if (error || !novaConversa) return NextResponse.json({ error: "db error" }, { status: 500 })
      conversaId = novaConversa.id

      await dispararAutomacoes({
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
      // Mesma transmissão de sempre, agora em @/lib/whatsapp/realtime (B6-02),
      // compartilhada com o canal do gateway: mesmo tópico, mesmo evento, mesmo
      // corpo. É o que faz a caixa de entrada não distinguir a origem.
      await transmitirMensagem({
        id: msgInserida.id,
        conversation_id: conversaId,
        workspace_id,
        direction: "recebida",
        type: "texto",
        content: messageText,
        created_at: messageAt,
        status: null,
      })

      // B11-04: depois de gravada, como no canal direto. A reação a uma mensagem
      // chega aqui como mensagem, e não é o cliente escrevendo: não dispara.
      if (!TIPOS_QUE_NAO_DISPARAM.includes(message.type ?? "")) {
        await dispararAutomacoes({
          tipo: "mensagem_recebida",
          workspaceId: workspace_id,
          contactId: contact.id,
          conversationId: conversaId,
          messageId: msgInserida.id,
          // Este webhook grava tudo como texto, mas as regras veem o tipo que a Meta mandou
          tipoMensagem: tipoDaMensagemParaRegras(TIPO_NO_CRM[message.type ?? "text"] ?? "desconhecido", messageText),
          texto: messageText,
        })
      }
    }
  }

  return NextResponse.json({ status: "ok" })
}
