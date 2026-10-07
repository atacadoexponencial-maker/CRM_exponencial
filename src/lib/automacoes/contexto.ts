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

export type ServiceClient = ReturnType<typeof createServiceClient>

export interface ContextoDaExecucao {
  supabase: ServiceClient
  gatilho: GatilhoAutomacao
}

/**
 * A conversa sobre a qual a regra age: a que acabou de ser criada, no gatilho
 * de conversa; nos outros, a conversa aberta do contato. É buscada a cada
 * chamada, e não guardada, para enxergar a conversa que uma ação anterior do
 * mesmo caminho criou (enviar mensagem cria uma, se não houver).
 */
export async function conversaDoEvento({ supabase, gatilho }: ContextoDaExecucao): Promise<string | null> {
  if (gatilho.tipo === "conversa_criada") return gatilho.conversationId
  if (!gatilho.contactId) return null
  return buscarConversaAberta(supabase, gatilho.workspaceId, gatilho.contactId)
}
