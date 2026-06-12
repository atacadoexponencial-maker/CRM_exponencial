// Envio de mensagem de texto WhatsApp pelo backend (service client), usado
// pelo motor de automações e pelo motor de sequências. Registra a mensagem
// na conversa aberta do contato (cria uma se não existir).

import type { createServiceClient } from "@/integrations/supabase/service"

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
  const [{ data: conn }, { data: contato }] = await Promise.all([
    supabase
      .from("whatsapp_connections")
      .select("phone_number_id, access_token")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle(),
    supabase.from("contacts").select("phone_number").eq("id", contactId).single(),
  ])

  if (!conn || !contato) return false

  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${conn.access_token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: contato.phone_number,
      type: "text",
      text: { body: texto },
    }),
  })

  if (!metaRes.ok) return false

  const metaData = (await metaRes.json()) as { messages?: Array<{ id: string }> }
  const wamid = metaData.messages?.[0]?.id ?? null
  const agora = new Date().toISOString()

  let conversaId = await buscarConversaAberta(supabase, workspaceId, contactId)

  if (!conversaId) {
    const { data: nova } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        status: "em_espera",
        assigned_to: null,
        unread_count: 0,
        last_message_text: texto,
        last_message_at: agora,
      })
      .select("id")
      .single()
    conversaId = nova?.id ?? null
  }

  if (!conversaId) return true // mensagem saiu, só não foi registrada em conversa

  await supabase.from("messages").insert({
    conversation_id: conversaId,
    workspace_id: workspaceId,
    direction: "enviada",
    type: "texto",
    content: texto,
    status: "enviado",
    wamid,
    created_at: agora,
  })

  await supabase
    .from("conversations")
    .update({ last_message_text: texto, last_message_at: agora })
    .eq("id", conversaId)

  return true
}
