// Fila das automações (B11-09). Quem dispara um gatilho (webhook, gateway,
// actions do funil, do contato e do chat) chama `dispararAutomacoes`: o evento é
// gravado em `automation_queue` e a resposta volta na hora. Logo depois da
// resposta, `after()` do Next consome a fila do contato e roda as regras
// (`processarAutomacoes`).
//
// Os eventos de um mesmo contato rodam um de cada vez, na ordem. Quem entrega o
// próximo é a função `reivindicar_evento_de_automacao`, no banco, que não entrega
// nada enquanto outro evento do contato está rodando. Quem termina um evento pega
// o próximo, então nenhum fica para trás.
//
// Nada aqui lança erro para quem disparou.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 11.

import { after } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import type { GatilhoAutomacao } from "./contexto"
import { processarAutomacoes } from "./index"

/** Freio de um consumo. O que sobrar fica para o próximo evento do contato. */
const LIMITE_POR_CONSUMO = 50

/** O contato do evento, ou a empresa quando ele não tem contato. */
export const chaveDaFila = (gatilho: GatilhoAutomacao) => gatilho.contactId ?? `workspace:${gatilho.workspaceId}`

export async function dispararAutomacoes(gatilho: GatilhoAutomacao): Promise<void> {
  try {
    const chave = chaveDaFila(gatilho)
    const { error } = await createServiceClient()
      .from("automation_queue")
      .insert({ workspace_id: gatilho.workspaceId, chave, evento: gatilho as unknown as Json })
    // Sem a fila, as regras rodam do mesmo jeito depois da resposta, só sem a ordem por contato
    await depoisDaResposta(error ? () => processarAutomacoes(gatilho) : () => consumirFila(chave))
  } catch {
    // Automação nunca derruba quem disparou
  }
}

/**
 * Agenda o trabalho para depois da resposta. Fora de uma requisição (script,
 * teste), `after` lança erro, e o trabalho roda na hora, como antes da fila.
 */
async function depoisDaResposta(trabalho: () => Promise<void>): Promise<void> {
  try {
    after(trabalho)
  } catch {
    await trabalho()
  }
}

/** Roda os eventos pendentes da chave, um de cada vez, até a fila dela esvaziar. */
export async function consumirFila(chave: string): Promise<void> {
  try {
    const supabase = createServiceClient()
    for (let i = 0; i < LIMITE_POR_CONSUMO; i++) {
      const { data, error } = await supabase.rpc("reivindicar_evento_de_automacao", { p_chave: chave })
      const item = data?.[0]
      if (error || !item) return
      // O motor não lança erro: cada regra registra no histórico o que deu certo ou não
      await processarAutomacoes(item.evento as unknown as GatilhoAutomacao)
      await supabase.from("automation_queue").delete().eq("id", item.id)
    }
  } catch {
    // Um evento que ficou "processando" é descartado pelo banco depois de 5 minutos
  }
}
