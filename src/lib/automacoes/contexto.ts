// O evento que disparou as regras e o que as verificações e as ações precisam
// saber dele. Os três pontos que chamam o motor (pipeline, webhook da Meta e
// recebimento do gateway) montam o `GatilhoAutomacao`; o resto do motor só lê.

import type { createServiceClient } from "@/integrations/supabase/service"
import { buscarConversaAberta } from "@/lib/whatsapp-envio"

export type GatilhoAutomacao =
  | {
      tipo: "card_movido"
      workspaceId: string
      contactId: string | null
      cardId: string
      funil: "entrada" | "recompra"
      etapa: string
    }
  | {
      tipo: "conversa_criada"
      workspaceId: string
      contactId: string
      conversationId: string
    }
  // B11-06: nascem nas actions do CRM que mudam o dado (`gatilhos-do-crm.ts`)
  | {
      tipo: "tag_adicionada"
      workspaceId: string
      contactId: string
      /** Já normalizada (minúsculas, sem espaço nas pontas). */
      tag: string
    }
  | {
      tipo: "etiqueta_aplicada"
      workspaceId: string
      contactId: string
      conversationId: string
      labelId: string
    }
  | {
      tipo: "dado_contato_alterado"
      workspaceId: string
      contactId: string
      /** classificacao, tipo, nicho ou cidade. */
      campo: string
      /** O valor novo; vazio quando o dado foi apagado. */
      valor: string
    }

export type ServiceClient = ReturnType<typeof createServiceClient>

export interface ContextoDaExecucao {
  supabase: ServiceClient
  gatilho: GatilhoAutomacao
}

/**
 * A conversa sobre a qual a regra age: a do evento, nos gatilhos de conversa
 * criada e de etiqueta aplicada; nos outros, a conversa aberta do contato. É buscada a cada
 * chamada, e não guardada, para enxergar a conversa que uma ação anterior do
 * mesmo caminho criou (enviar mensagem cria uma, se não houver).
 */
export async function conversaDoEvento({ supabase, gatilho }: ContextoDaExecucao): Promise<string | null> {
  if (gatilho.tipo === "conversa_criada" || gatilho.tipo === "etiqueta_aplicada") return gatilho.conversationId
  if (!gatilho.contactId) return null
  return buscarConversaAberta(supabase, gatilho.workspaceId, gatilho.contactId)
}
