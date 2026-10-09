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
// Cada consumo tem um orçamento de tempo (B22-06), abaixo dos ~300 s em que a
// Vercel corta a função: assim o que não deu tempo de rodar fica no histórico, e
// um evento ainda rodando nunca chega aos 5 minutos em que o banco o considera
// perdido.
//
// Nada aqui lança erro para quem disparou.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 11 e 22.

import { after } from "next/server"
import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import type { GatilhoAutomacao } from "./contexto"
import { processarAutomacoes } from "./index"

/**
 * Até aqui, desde o começo do consumo, as regras rodam. Depois, os eventos que a
 * fila ainda entregar só registram as regras deles como "não rodou", o que é rápido.
 */
export const PRAZO_DAS_REGRAS_MS = 240_000
/** Daqui em diante o consumo não pega mais eventos: os que sobrarem esperam o próximo evento do contato. */
export const PRAZO_DA_FILA_MS = 270_000

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

/** Roda os eventos pendentes da chave, um de cada vez, até a fila dela esvaziar ou o tempo acabar. */
export async function consumirFila(chave: string): Promise<void> {
  const inicio = Date.now()
  try {
    const supabase = createServiceClient()
    while (Date.now() - inicio < PRAZO_DA_FILA_MS) {
      const { data, error } = await supabase.rpc("reivindicar_evento_de_automacao", { p_chave: chave })
      const item = data?.[0]
      if (error || !item) return
      // O motor não lança erro: cada regra registra no histórico o que deu certo ou não
      await processarAutomacoes(item.evento as unknown as GatilhoAutomacao, { prazo: inicio + PRAZO_DAS_REGRAS_MS })
      await supabase.from("automation_queue").delete().eq("id", item.id)
    }
  } catch {
    // Um evento que ficou "processando" é descartado pelo banco depois de 5 minutos
  }
}
