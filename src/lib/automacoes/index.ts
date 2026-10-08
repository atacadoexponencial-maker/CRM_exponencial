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
// Antes de percorrer, a proteção de repetição da regra pode barrar o contato;
// depois, a execução é gravada no histórico, com o caminho (B11-03, `execucoes.ts`).
//
// Roda sempre no backend com o service client (o webhook não tem sessão de
// usuário) e nunca propaga erro para quem disparou o gatilho.
//
// Quem dispara não chama este arquivo direto (B11-09): grava o evento na fila
// (`fila.ts`), que chama `processarAutomacoes` logo depois da resposta, um evento
// de cada vez por contato.
// Decisões: pre-desenvolvimento/decisoes/B11-automacoes-em-fluxo.md, seções 5, 8 e 11.

import { createServiceClient } from "@/integrations/supabase/service"
import {
  gatilhoDoFluxo,
  lerRepeticao,
  normalizarTag,
  percorrerFluxo,
  problemasDeEstrutura,
  type BlocoGatilho,
  type Fluxo,
} from "@/lib/fluxo-automacao"
import { executarAcao } from "./acoes"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "./contexto"
import {
  motivoParaIgnorar,
  passosDoCaminho,
  registrarExecucao,
  resultadoDoCaminho,
  type RegraDaExecucao,
} from "./execucoes"
import { lerFluxo } from "./fluxo-recebido"
import { fluxoDaRegraAntiga } from "./regra-antiga"
import { verificacaoVale } from "./verificacoes"

export type { GatilhoAutomacao } from "./contexto"

interface RegraCarregada extends RegraDaExecucao {
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
      await executarRegra(contexto, regra)
    }
  } catch {
    // Automação nunca pode derrubar o fluxo principal (envio, webhook, pipeline)
  }
}

/** Proteção, percurso e registro de uma regra. Cada regra é isolada: nada aqui sobe. */
async function executarRegra(contexto: ContextoDaExecucao, regra: RegraCarregada): Promise<void> {
  const { supabase, gatilho } = contexto

  let motivo: string | null
  try {
    motivo = await motivoParaIgnorar(supabase, regra, gatilho.contactId)
  } catch {
    // Melhor não disparar do que disparar em dobro
    await registrarExecucao(supabase, {
      gatilho,
      regra,
      resultado: "falhou",
      motivo: "Não foi possível conferir a proteção de repetição",
    })
    return
  }
  if (motivo) {
    await registrarExecucao(supabase, { gatilho, regra, resultado: "ignorada", motivo })
    return
  }

  try {
    const caminho = await percorrerFluxo(regra.fluxo, {
      avaliarVerificacao: (verificacao) => verificacaoVale(contexto, verificacao),
      executarAcao: (bloco) => executarAcao(contexto, bloco),
    })
    await registrarExecucao(supabase, {
      gatilho,
      regra,
      resultado: resultadoDoCaminho(caminho),
      motivo: caminho.erro?.motivo,
      passos: passosDoCaminho(regra.fluxo, caminho),
    })
  } catch {
    await registrarExecucao(supabase, { gatilho, regra, resultado: "falhou", motivo: "Erro inesperado ao rodar a regra" })
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
      .select("id, nome, created_at, gatilho_tipo, gatilho_config, acao_tipo, acao_config")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("gatilho_tipo", gatilho.tipo)
      .eq("ativa", true),
    supabase
      .from("automation_flows")
      .select("id, nome, created_at, fluxo, repeticao")
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
    if (substituidas.has(r.id)) continue
    // Regra antiga não tem proteção de repetição: roda sempre, como rodava
    regras.push({
      id: r.id,
      origem: "antiga",
      nome: r.nome,
      repeticao: { modo: "sempre" },
      criadaEm: r.created_at,
      fluxo: fluxoDaRegraAntiga(r),
    })
  }
  for (const r of fluxos.data ?? []) {
    // Fluxo fora do formato (gravado por fora do editor) não roda
    const fluxo = lerFluxo(r.fluxo)
    if (!fluxo) continue
    regras.push({
      id: r.id,
      origem: "fluxo",
      nome: r.nome,
      repeticao: lerRepeticao(r.repeticao),
      criadaEm: r.created_at,
      fluxo,
    })
  }
  return regras.sort((a, b) => (a.criadaEm < b.criadaEm ? -1 : a.criadaEm > b.criadaEm ? 1 : 0))
}

/** O evento é o que o bloco de gatilho espera? Parâmetro vazio vale como "qualquer". */
export function gatilhoCorresponde(bloco: BlocoGatilho, gatilho: GatilhoAutomacao): boolean {
  if (bloco.gatilho !== gatilho.tipo) return false
  const p = bloco.parametros
  switch (gatilho.tipo) {
    case "card_movido":
      return (!p.funil || p.funil === gatilho.funil) && (!p.etapa || p.etapa === gatilho.etapa)
    case "tag_adicionada":
      return !p.tag || normalizarTag(p.tag) === gatilho.tag
    case "etiqueta_aplicada":
      return !p.label_id || p.label_id === gatilho.labelId
    case "dado_contato_alterado":
      // O campo é obrigatório no gatilho; o valor, não
      return p.campo === gatilho.campo && (!p.valor || p.valor.trim() === gatilho.valor)
    default:
      return true
  }
}
