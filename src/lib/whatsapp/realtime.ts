// Transmissão da mensagem nova para a caixa de entrada aberta no navegador.
//
// Extraído do webhook da Meta na B6-02, para os dois canais transmitirem no
// mesmo tópico e com o mesmo formato — é o que faz a caixa de entrada não
// distinguir de onde a mensagem veio. O corpo enviado é idêntico ao de antes.
//
// Nunca derruba quem chamou: mensagem gravada e não transmitida aparece no
// próximo carregamento da página; exceção aqui perderia a resposta ao webhook e
// faria o gateway reenviar um evento já gravado.

import { createServiceClient } from "@/integrations/supabase/service"

export type MensagemTransmitida = {
  id: string
  conversation_id: string
  workspace_id: string
  direction: string
  type: string
  content: string
  created_at: string
  status: string | null
}

async function enviarAoRealtime(mensagens: Array<{ topic: string; event: string; payload: unknown }>): Promise<void> {
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      // B19-04: canais privados — só entra quem passa na policy de realtime.messages.
      messages: mensagens.map((m) => ({ ...m, private: true })),
    }),
  })
}

async function transmitir(workspaceId: string, event: string, payload: unknown): Promise<void> {
  await enviarAoRealtime([{ topic: `workspace:${workspaceId}`, event, payload }])
}

/**
 * B21-01: a mensagem leva o texto, então não vai mais para o tópico da empresa toda.
 * Vai para `workspace:<id>:gestao` (Admin/Gerente) e para `usuario:<responsável>` —
 * conversa sem responsável só a gestão vê, como na caixa de entrada.
 */
export async function transmitirMensagem(mensagem: MensagemTransmitida): Promise<void> {
  const { data: conversa } = await createServiceClient()
    .from("conversations")
    .select("assigned_to")
    .eq("id", mensagem.conversation_id)
    .eq("workspace_id", mensagem.workspace_id)
    .maybeSingle()

  const topicos = [`workspace:${mensagem.workspace_id}:gestao`]
  if (conversa?.assigned_to) topicos.push(`usuario:${conversa.assigned_to}`)

  await enviarAoRealtime(topicos.map((topic) => ({ topic, event: "nova_mensagem", payload: mensagem })))
}

/**
 * B13-02: o contato foi para a lixeira. A caixa de entrada aberta tira as
 * conversas dele — as políticas do banco já as escondem, mas a tela aberta não
 * relê sozinha.
 */
export async function transmitirContatoExcluido(workspaceId: string, contactId: string): Promise<void> {
  await transmitir(workspaceId, "contato_excluido", { contact_id: contactId })
}

/** B13-05: o contato saiu da lixeira; a caixa de entrada aberta volta a mostrá-lo. */
export async function transmitirContatoRestaurado(workspaceId: string, contactId: string): Promise<void> {
  await transmitir(workspaceId, "contato_restaurado", { contact_id: contactId })
}
