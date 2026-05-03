"use server"

import { createClient } from "@/integrations/supabase/server"
import type { Mensagem, TipoMensagem, DirecaoMensagem, StatusMensagem } from "./mock-mensagens"

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
