// O evento que disparou as regras e o que as verificações e as ações precisam
// saber dele. Quem dispara (pipeline, telas do CRM, webhook da Meta e
// recebimento do gateway) monta o `GatilhoAutomacao`; o resto do motor só lê.

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
  // Gatilhos de mensagem, que nascem logo depois de a mensagem ser gravada: a
  // recebida, nos dois canais (B11-04); a enviada por uma pessoa, no chat (B11-05)
  | ({
      tipo: "mensagem_recebida" | "mensagem_enviada_time"
      workspaceId: string
      contactId: string
    } & MensagemDoEvento)

/** A mensagem que disparou, nos gatilhos de mensagem: é o que as condições de texto e tipo leem. */
export interface MensagemDoEvento {
  /** A conversa onde a mensagem chegou ou de onde saiu. */
  conversationId: string
  messageId: string
  /** No vocabulário do CRM: texto, imagem, audio, video, documento, figurinha… */
  tipoMensagem: string
  /** O que foi escrito: o texto ou a legenda. Vazio quando não há. */
  texto: string
}

/**
 * O tipo da mensagem como as regras enxergam: o do CRM, menos `desconhecido`
 * com texto, que conta como `texto`. O gateway manda tipo fora do mapa quando o
 * cliente responde citando outra mensagem ou manda link (`traduzirConteudo`), e
 * "tipo é texto" falharia em toda resposta citada.
 */
export function tipoDaMensagemParaRegras(tipoNoCrm: string, texto: string): string {
  return tipoNoCrm === "desconhecido" && texto.trim() !== "" ? "texto" : tipoNoCrm
}

export type ServiceClient = ReturnType<typeof createServiceClient>

export interface ContextoDaExecucao {
  supabase: ServiceClient
  gatilho: GatilhoAutomacao
}

/**
 * A conversa sobre a qual a regra age: a do evento, quando ele tem uma (conversa
 * criada, etiqueta aplicada, gatilhos de mensagem); nos outros, a conversa aberta
 * do contato. É buscada a cada chamada, e não guardada, para enxergar a
 * conversa que uma ação anterior do mesmo caminho criou (enviar mensagem cria
 * uma, se não houver).
 */
export async function conversaDoEvento({ supabase, gatilho }: ContextoDaExecucao): Promise<string | null> {
  if ("conversationId" in gatilho) return gatilho.conversationId
  if (!gatilho.contactId) return null
  return buscarConversaAberta(supabase, gatilho.workspaceId, gatilho.contactId)
}
