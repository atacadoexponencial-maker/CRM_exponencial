// Montagem das conversas da caixa de entrada, a partir do banco.
//
// Usada pela página, na carga, e por `buscarConversa`, quando uma conversa é
// criada com a tela aberta. Um lugar só, para a conversa que chega ao vivo ser
// idêntica à que apareceria recarregando — inclusive na regra do atendente.

import type { createClient } from "@/integrations/supabase/server"
import { formatarDataCurta, formatarHorarioDaLista } from "@/lib/datas"
import { nomeDoCanal, recursosDoCanal } from "@/lib/whatsapp"
import type { CanalWhatsApp } from "@/lib/whatsapp"
import type { Conversa, StatusConversa } from "./mock-conversas"

type Cliente = Awaited<ReturnType<typeof createClient>>

export async function listarConversas(
  supabase: Cliente,
  {
    workspaceId,
    papel,
    userId,
    conversaId,
  }: {
    workspaceId: string
    papel: string
    userId: string
    /** Restringe a uma conversa só. */
    conversaId?: string
  }
): Promise<Conversa[]> {
  let query = supabase
    .from("conversations")
    // B7-02: `conexao` traz o canal e o número que atendem a conversa. Nunca
    // credencial: só o que a tela mostra.
    .select("id, status, assigned_to, unread_count, last_message_text, last_message_at, created_at, contact_id, contact:contacts(name, phone_number), assignee:profiles!assigned_to(name), conversation_labels(label_id, labels(id, name, color)), conexao:whatsapp_connections(id, canal, phone_number)")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false })

  if (papel === "atendente") {
    query = query.eq("assigned_to", userId)
  }

  if (conversaId) {
    query = query.eq("id", conversaId)
  }

  const { data: rows } = await query

  type LabelRow = { id: string; name: string; color: string } | null
  type ConvLabelRow = { label_id: string; labels: LabelRow }
  type ConversationRow = {
    id: string
    status: string
    unread_count: number
    last_message_text: string
    last_message_at: string
    created_at: string
    contact_id: string | null
    contact: { name: string | null; phone_number: string } | null
    assignee: { name: string } | null
    conversation_labels: ConvLabelRow[]
    conexao: { id: string; canal: CanalWhatsApp | null; phone_number: string | null } | null
  }

  return ((rows ?? []) as unknown as ConversationRow[]).map((c) => ({
    id: c.id,
    contato: {
      nome: c.contact?.name ?? null,
      telefone: c.contact?.phone_number ?? "",
      contactId: c.contact_id ?? null,
    },
    ultimaMensagem: {
      texto: c.last_message_text,
      horario: formatarHorarioDaLista(c.last_message_at),
    },
    naoLidas: c.unread_count,
    status: c.status as StatusConversa,
    etiquetas: (c.conversation_labels ?? [])
      .filter((cl) => cl.labels)
      .map((cl) => ({ id: cl.labels!.id, nome: cl.labels!.name, cor: cl.labels!.color })),
    atribuidaA: c.assignee?.name ?? null,
    dataPrimeiroContato: formatarDataCurta(c.created_at),
    // B7-02: o que o canal faz é decidido aqui, no servidor. A tela exibe.
    canal: {
      id: c.conexao?.id ?? null,
      nome: c.conexao ? nomeDoCanal(c.conexao.canal) : null,
      numero: c.conexao?.phone_number ?? null,
      recursos: recursosDoCanal(c.conexao?.canal ?? null),
    },
  }))
}
