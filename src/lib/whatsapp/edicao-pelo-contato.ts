// Mensagem editada ou apagada pelo contato, avisada pela API Oficial (B23-05).
//
// Só acontece em número em uso no WhatsApp Business do celular (coexistência):
// a Meta manda, no webhook `messages`, um item de `type: "edit"` ou `"revoke"`
// apontando para a mensagem original. Não é mensagem nova: a original é
// alterada, como o canal direto já faz desde a B6-03 (`aplicarAvisoDeSistema`).
// Apagada é marcada, nunca removida: o atendente precisa saber que havia algo ali.

import type { createServiceClient } from "@/integrations/supabase/service"
import { lerMensagemMeta, type MensagemMeta } from "./mensagem-meta"
import { aplicarAvisoDeSistema } from "./recebimento"

type ServiceClient = ReturnType<typeof createServiceClient>

/** O item do webhook `messages` quando o contato edita ou apaga. */
export type AvisoDeEdicaoDaMeta = {
  type?: string
  timestamp?: string
  edit?: { original_message_id?: string; message?: MensagemMeta }
  revoke?: { original_message_id?: string }
}

export const TIPOS_DE_EDICAO = ["edit", "revoke"]

/** Aplica a edição ou a exclusão à mensagem original. Devolve se achou a original. */
export async function aplicarEdicaoOuExclusaoDaMeta({
  supabase,
  workspaceId,
  aviso,
  quando,
}: {
  supabase: ServiceClient
  /** Só mensagem da empresa do número por onde o aviso chegou. */
  workspaceId: string
  aviso: AvisoDeEdicaoDaMeta
  quando: string
}): Promise<boolean> {
  if (aviso.type === "revoke") {
    const alvo = aviso.revoke?.original_message_id
    if (!alvo) return false
    return aplicarAvisoDeSistema({ supabase, workspaceId, aviso: { action: "deleted", target_message_id: alvo }, quando })
  }

  if (aviso.type !== "edit") return false
  const alvo = aviso.edit?.original_message_id
  if (!alvo) return false
  const textoNovo = aviso.edit?.message ? lerMensagemMeta(aviso.edit.message).conteudo : ""

  const { data: original } = await supabase
    .from("messages")
    .select("id, type")
    .eq("wamid", alvo)
    .eq("workspace_id", workspaceId)
    .maybeSingle()
  if (!original) return false

  // Mídia: o arquivo fica em `content`; o que o contato edita é a legenda.
  if (original.type !== "texto") {
    const { data } = await supabase
      .from("messages")
      .update({ media_caption: textoNovo || null, edited_at: quando })
      .eq("id", original.id)
      .select("id")
      .maybeSingle()
    return Boolean(data)
  }

  return aplicarAvisoDeSistema({
    supabase,
    workspaceId,
    aviso: { action: "edited", target_message_id: alvo, new_text: textoNovo },
    quando,
  })
}
