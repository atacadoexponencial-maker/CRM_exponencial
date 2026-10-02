// Transmissão da mensagem nova para a caixa de entrada aberta no navegador.
//
// Extraído do webhook da Meta na B6-02, para os dois canais transmitirem no
// mesmo tópico e com o mesmo formato — é o que faz a caixa de entrada não
// distinguir de onde a mensagem veio. O corpo enviado é idêntico ao de antes.
//
// Nunca derruba quem chamou: mensagem gravada e não transmitida aparece no
// próximo carregamento da página; exceção aqui perderia a resposta ao webhook e
// faria o gateway reenviar um evento já gravado.

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

async function transmitir(workspaceId: string, event: string, payload: unknown): Promise<void> {
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ topic: `workspace:${workspaceId}`, event, payload }],
    }),
  })
}

export async function transmitirMensagem(mensagem: MensagemTransmitida): Promise<void> {
  await transmitir(mensagem.workspace_id, "nova_mensagem", mensagem)
}

/**
 * B13-02: o contato foi para a lixeira. A caixa de entrada aberta tira as
 * conversas dele — as políticas do banco já as escondem, mas a tela aberta não
 * relê sozinha.
 */
export async function transmitirContatoExcluido(workspaceId: string, contactId: string): Promise<void> {
  await transmitir(workspaceId, "contato_excluido", { contact_id: contactId })
}
