// Montagem das conversas da caixa de entrada, a partir do banco.
//
// Usada pela página, na carga, e por `buscarConversa`, quando uma conversa é
// criada com a tela aberta. Um lugar só, para a conversa que chega ao vivo ser
// idêntica à que apareceria recarregando — inclusive na regra do atendente.

import type { createClient } from "@/integrations/supabase/server"
import { createServiceClient } from "@/integrations/supabase/service"
import { urlsAssinadasDasFotos } from "@/lib/whatsapp/foto-de-perfil"
import { formatarDataCurta, formatarHorarioDaLista } from "@/lib/datas"
import { nomeDoCanal, recursosDoCanal } from "@/lib/whatsapp"
import type { CanalWhatsApp } from "@/lib/whatsapp"
import type { Conversa, StatusConversa } from "./mock-conversas"

type Cliente = Awaited<ReturnType<typeof createClient>>

/** Conversas por página na caixa de entrada (B10-04). */
export const TAMANHO_PAGINA_CONVERSAS = 50

export async function listarConversas(
  supabase: Cliente,
  {
    workspaceId,
    papel,
    userId,
    conversaId,
    limite,
    antesDe,
  }: {
    workspaceId: string
    papel: string
    userId: string
    /** Restringe a uma conversa só. */
    conversaId?: string
    /** Quantas trazer. Sem limite quando ausente (uso interno). */
    limite?: number
    /** Só conversas com atividade anterior a este instante (ISO): página seguinte. */
    antesDe?: string
  }
): Promise<Conversa[]> {
  let query = supabase
    .from("conversations")
    // B7-02: `conexao` traz o canal e o número que atendem a conversa. Nunca
    // credencial: só o que a tela mostra.
    .select("id, status, assigned_to, unread_count, last_message_text, last_message_at, created_at, contact_id, contact:contacts(name, phone_number, photo_path), assignee:profiles!assigned_to(name), conversation_labels(label_id, labels(id, name, color)), conexao:whatsapp_connections(id, canal, phone_number)")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false })

  // B45-03: fila aberta: o atendente vê as conversas dele e as sem responsável
  if (papel === "atendente") {
    query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`)
  }

  if (conversaId) {
    query = query.eq("id", conversaId)
  }

  if (antesDe) {
    query = query.lt("last_message_at", antesDe)
  }

  if (limite) {
    query = query.limit(limite)
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
    contact: { name: string | null; phone_number: string; photo_path: string | null } | null
    assignee: { name: string } | null
    conversation_labels: ConvLabelRow[]
    conexao: { id: string; canal: CanalWhatsApp | null; phone_number: string | null } | null
  }

  const linhas = (rows ?? []) as unknown as ConversationRow[]
  // B29: a cópia da foto fica num bucket privado; a tela recebe um endereço
  // assinado de 1 h, gerado aqui de uma vez para a página toda.
  const fotos = await urlsAssinadasDasFotos(
    createServiceClient(),
    linhas.map((c) => c.contact?.photo_path ?? "").filter(Boolean)
  ).catch(() => new Map<string, string>())

  return linhas.map((c) => ({
    id: c.id,
    contato: {
      nome: c.contact?.name ?? null,
      telefone: c.contact?.phone_number ?? "",
      contactId: c.contact_id ?? null,
      fotoUrl: (c.contact?.photo_path && fotos.get(c.contact.photo_path)) || null,
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
    atividadeEm: c.last_message_at,
    // B7-02: o que o canal faz é decidido aqui, no servidor. A tela exibe.
    canal: {
      id: c.conexao?.id ?? null,
      nome: c.conexao ? nomeDoCanal(c.conexao.canal) : null,
      numero: c.conexao?.phone_number ?? null,
      recursos: recursosDoCanal(c.conexao?.canal ?? null),
    },
  }))
}
