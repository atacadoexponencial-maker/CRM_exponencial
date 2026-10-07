// Motor de automações (B11-02): cada regra é um fluxo de blocos, percorrido a
// partir do gatilho. Condições seguem pelo "sim" ou pelo "não", ações executam
// e seguem mesmo se falharem, e o caminho termina numa saída sem ligação.
//
// Até o merge do branch da B11, as regras vêm de duas tabelas:
//  - `automations`, as da primeira versão (um gatilho, uma ação), que a
//    produção continua editando. Viram fluxo na hora (`regra-antiga.ts`).
//  - `automation_flows`, as regras em fluxo, que só o branch conhece.
// As duas rodam juntas, na ordem de criação.
//
// Roda sempre no backend com o service client (o webhook não tem sessão de
// usuário) e nunca propaga erro para quem disparou o gatilho.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seção 5.

import { createServiceClient } from "@/integrations/supabase/service"
import {
  gatilhoDoFluxo,
  percorrerFluxo,
  problemasDeEstrutura,
  type BlocoGatilho,
  type Fluxo,
} from "@/lib/fluxo-automacao"
import { executarAcao } from "./acoes"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "./contexto"
import { lerFluxo } from "./fluxo-recebido"
import { fluxoDaRegraAntiga } from "./regra-antiga"
import { verificacaoVale } from "./verificacoes"

export type { GatilhoAutomacao } from "./contexto"

interface RegraCarregada {
  id: string
  criadaEm: string
  fluxo: Fluxo
}

export async function processarAutomacoes(gatilho: GatilhoAutomacao): Promise<void> {
  try {
    const supabase = createServiceClient()

    // B13-03: nada dispara para contato na lixeira.
    if (gatilho.contactId) {
      const { data: naLixeira } = await supabase.rpc("contato_na_lixeira", { p_contact_id: gatilho.contactId })
      if (naLixeira) return
    }

    const contexto: ContextoDaExecucao = { supabase, gatilho }

    for (const regra of await carregarRegras(supabase, gatilho)) {
      const blocoGatilho = gatilhoDoFluxo(regra.fluxo)
      if (!blocoGatilho || problemasDeEstrutura(regra.fluxo).length > 0) continue
      if (!gatilhoCorresponde(blocoGatilho, gatilho)) continue

      // Cada regra é isolada: erro ao avaliar uma condição encerra só esta.
      await percorrerFluxo(regra.fluxo, {
        avaliarVerificacao: (verificacao) => verificacaoVale(contexto, verificacao),
        executarAcao: (bloco) => executarAcao(contexto, bloco),
      }).catch(() => {})
    }
  } catch {
    // Automação nunca pode derrubar o fluxo principal (envio, webhook, pipeline)
  }
}

/**
 * Regras ativas do workspace para o gatilho, das duas tabelas, na ordem de
 * criação. As consultas são independentes: se uma falhar (por exemplo,
 * `automation_flows` ainda não existe no banco), as regras da outra rodam.
 *
 * Regra antiga que já tem versão em fluxo (B11-10) não roda, mesmo com a versão
 * nova pausada: o admin trocou uma pela outra.
 */
async function carregarRegras(supabase: ServiceClient, gatilho: GatilhoAutomacao): Promise<RegraCarregada[]> {
  const [antigas, fluxos, convertidas] = await Promise.all([
    supabase
      .from("automations")
      .select("id, created_at, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("gatilho_tipo", gatilho.tipo)
      .eq("ativa", true),
    supabase
      .from("automation_flows")
      .select("id, created_at, fluxo")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("gatilho_tipo", gatilho.tipo)
      .eq("ativa", true),
    supabase
      .from("automation_flows")
      .select("automation_id")
      .eq("workspace_id", gatilho.workspaceId)
      .not("automation_id", "is", null),
  ])

  const substituidas = new Set((convertidas.data ?? []).map((r) => r.automation_id))
  const regras: RegraCarregada[] = []
  for (const r of antigas.data ?? []) {
    if (!substituidas.has(r.id)) regras.push({ id: r.id, criadaEm: r.created_at, fluxo: fluxoDaRegraAntiga(r) })
  }
  for (const r of fluxos.data ?? []) {
    // Fluxo fora do formato (gravado por fora do editor) não roda
    const fluxo = lerFluxo(r.fluxo)
    if (fluxo) regras.push({ id: r.id, criadaEm: r.created_at, fluxo })
  }
  return regras.sort((a, b) => (a.criadaEm < b.criadaEm ? -1 : a.criadaEm > b.criadaEm ? 1 : 0))
}

function gatilhoCorresponde(bloco: BlocoGatilho, gatilho: GatilhoAutomacao): boolean {
  if (bloco.gatilho !== gatilho.tipo) return false
  if (gatilho.tipo === "card_movido") {
    // Parâmetro vazio = qualquer funil ou etapa
    const { funil, etapa } = bloco.parametros
    if (funil && funil !== gatilho.funil) return false
    if (etapa && etapa !== gatilho.etapa) return false
  }
  return true
}
