// Envio de mensagem de texto WhatsApp pelo backend (service client), usado
// pelo motor de automações e pelo motor de sequências. Registra a mensagem
// na conversa aberta do contato (cria uma se não existir).

import type { createServiceClient } from "@/integrations/supabase/service"
import { resolverProviderDoContato } from "@/lib/whatsapp"

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
  // B7-01: o número é o da conversa aberta do contato, e não "um do
  // workspace". É por aqui que automações e sequências passam, e elas não têm
  // conversa em mão — por isso a resolução é por contato.
  const [provider, { data: contato }] = await Promise.all([
    resolverProviderDoContato(supabase, workspaceId, contactId),
    supabase.from("contacts").select("phone_number").eq("id", contactId).single(),
  ])

  if (!provider || !contato) return false

  const resultado = await provider.enviarTexto(contato.phone_number, texto)

  if (!resultado.ok) return false

  const wamid = resultado.mensagemId
  const agora = new Date().toISOString()

  let conversaId = await buscarConversaAberta(supabase, workspaceId, contactId)

  if (!conversaId) {
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
        last_message_text: texto,
        last_message_at: agora,
        whatsapp_connection_id: conexao?.id ?? null,
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
