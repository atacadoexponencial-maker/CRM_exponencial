// Esperas das automações (B28-02). Quando o caminho chega num bloco "esperar", o
// motor (`index.ts`) grava a execução como "esperando", com o evento inteiro e a
// hora de seguir. Aqui ela segue: o relógio (rota /api/automacoes/relogio, que o
// gateway chama a cada 15 s) reivindica as esperas vencidas no banco, e cada uma
// continua pela saída do tempo, na mesma linha do histórico.
//
// Cada espera é entregue no máximo uma vez (`reivindicar_esperas_vencidas`): duas
// chamadas juntas não seguem a mesma, e a que a função não terminou vira falha em
// vez de repetir, como a fila (B11-09).
//
// Contato na lixeira tem as esperas canceladas. A regra excluída, desativada ou sem
// o bloco cancela a espera quando ela vence; o aviso antes de mudar a regra é da B28-04.
// Spec: pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md

import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import { duracaoDaEspera, percorrerFluxo, type Fluxo, type SaidaDaEspera } from "@/lib/fluxo-automacao"
import type { ContextoDaExecucao, GatilhoAutomacao, ServiceClient } from "./contexto"
import { passosDoCaminho, resultadoDosPassos, type PassoGravado } from "./execucoes"
import { lerFluxo } from "./fluxo-recebido"
import { executoresDaRegra } from "./index"

/** Esperas pegas de cada vez: as ações de cada uma rodam em sequência. */
const ESPERAS_POR_VEZ = 20
/** Até aqui, desde o começo da chamada, o relógio pega mais esperas; abaixo dos ~300 s da Vercel. */
export const PRAZO_DO_RELOGIO_MS = 240_000

export const CONTATO_NA_LIXEIRA = "Cancelada: o contato foi para a lixeira"
export const REGRA_EXCLUIDA = "Cancelada: a regra foi excluída"
export const REGRA_DESATIVADA = "Cancelada: a regra foi desativada"
export const BLOCO_SAIU = "Cancelada: o bloco de espera saiu da regra"
const FORA_DO_FORMATO = "Não seguiu: a execução esperando está fora do formato"
const ERRO_AO_SEGUIR = "Erro inesperado ao seguir a espera"

/** Quando o relógio segue o contato parado no bloco, ou `null` se o bloco não espera tempo. */
export function retomarEm(fluxo: Fluxo, esperaId: string, agora: Date): string | null {
  const bloco = fluxo.blocos.find((b) => b.id === esperaId)
  if (bloco?.tipo !== "espera") return null
  const duracao = duracaoDaEspera(bloco.tempo)
  return duracao === null ? null : new Date(agora.getTime() + duracao).toISOString()
}

/** Uma linha de `automation_runs` esperando, como a função de reivindicar entrega. */
interface ExecucaoEsperando {
  id: string
  regra_id: string
  contact_id: string | null
  gatilho: Json | null
  caminho: Json
}

/** Segue as esperas vencidas até acabarem ou o prazo passar. Devolve quantas pegou. Erro do banco ao reivindicar sobe. */
export async function seguirEsperasVencidas(prazo = Date.now() + PRAZO_DO_RELOGIO_MS): Promise<number> {
  const supabase = createServiceClient()
  let pegas = 0
  while (Date.now() < prazo) {
    const { data, error } = await supabase.rpc("reivindicar_esperas_vencidas", { p_limite: ESPERAS_POR_VEZ })
    if (error) throw error
    const vencidas = (data ?? []) as ExecucaoEsperando[]
    for (const execucao of vencidas) await seguirEspera(supabase, execucao)
    pegas += vencidas.length
    if (vencidas.length < ESPERAS_POR_VEZ) break
  }
  return pegas
}

/** A espera vencida segue pela saída do tempo, ou é cancelada. Nunca lança: cada espera é isolada. */
async function seguirEspera(supabase: ServiceClient, execucao: ExecucaoEsperando): Promise<void> {
  try {
    const passos = (Array.isArray(execucao.caminho) ? execucao.caminho : []) as unknown as PassoGravado[]
    const esperaId = passos.at(-1)?.bloco.tipo === "espera" ? passos.at(-1)!.bloco.id : null
    const gatilho = execucao.gatilho as unknown as GatilhoAutomacao | null
    if (!esperaId || !gatilho) return await terminar(supabase, execucao.id, "falhou", FORA_DO_FORMATO)

    if (execucao.contact_id) {
      const { data: naLixeira } = await supabase.rpc("contato_na_lixeira", { p_contact_id: execucao.contact_id })
      if (naLixeira) return await terminar(supabase, execucao.id, "cancelada", CONTATO_NA_LIXEIRA)
    }

    const { data: regra, error } = await supabase
      .from("automation_flows")
      .select("id, nome, ativa, fluxo")
      .eq("id", execucao.regra_id)
      .maybeSingle()
    if (error) throw error
    if (!regra) return await terminar(supabase, execucao.id, "cancelada", REGRA_EXCLUIDA)
    if (!regra.ativa) return await terminar(supabase, execucao.id, "cancelada", REGRA_DESATIVADA)
    const fluxo = lerFluxo(regra.fluxo)
    const bloco = fluxo?.blocos.find((b) => b.id === esperaId)
    if (!fluxo || bloco?.tipo !== "espera") return await terminar(supabase, execucao.id, "cancelada", BLOCO_SAIU)

    // O bloco perdeu o tempo depois que o contato entrou: ele segue esperando, sem hora
    if (!bloco.tempo) {
      await supabase
        .from("automation_runs")
        .update({ retomar_em: null, retomada_em: null, atualizada_em: new Date().toISOString() })
        .eq("id", execucao.id)
      return
    }

    await seguirPelaSaida(supabase, {
      execucaoId: execucao.id,
      regra: { id: regra.id, nome: regra.nome },
      fluxo,
      gatilho,
      passos,
      saida: "tempo",
    })
  } catch {
    await terminar(supabase, execucao.id, "falhou", ERRO_AO_SEGUIR)
  }
}

/**
 * Continua a execução pela saída que a espera tomou, com o mesmo evento. O passo
 * do bloco ganha a saída e a hora; o resultado vale para o caminho inteiro. Num
 * segundo bloco "esperar", a mesma linha volta a esperar.
 */
export async function seguirPelaSaida(
  supabase: ServiceClient,
  dados: {
    execucaoId: string
    regra: { id: string; nome: string }
    fluxo: Fluxo
    gatilho: GatilhoAutomacao
    passos: PassoGravado[]
    saida: SaidaDaEspera
  }
): Promise<void> {
  const { fluxo, passos, saida } = dados
  const esperaId = passos[passos.length - 1].bloco.id
  const contexto: ContextoDaExecucao = { supabase, gatilho: dados.gatilho, regra: dados.regra }
  const caminho = await percorrerFluxo(fluxo, executoresDaRegra(contexto), { bloco: esperaId, saida })

  const agora = new Date()
  const anteriores = passos.map((p, i) => (i === passos.length - 1 ? { ...p, saida, em: agora.toISOString() } : p))
  const todos = [...anteriores, ...passosDoCaminho(fluxo, caminho, agora)]
  await supabase
    .from("automation_runs")
    .update({
      resultado: caminho.espera ? "esperando" : resultadoDosPassos(todos),
      motivo: caminho.erro?.motivo ?? null,
      caminho: todos as unknown as Json,
      retomar_em: caminho.espera ? retomarEm(fluxo, caminho.espera, agora) : null,
      retomada_em: null,
      atualizada_em: agora.toISOString(),
    })
    .eq("id", dados.execucaoId)
}

/** Encerra a execução sem seguir. Nunca lança: a próxima chamada do relógio não a pega de novo de qualquer jeito. */
async function terminar(
  supabase: ServiceClient,
  execucaoId: string,
  resultado: "falhou" | "cancelada",
  motivo: string
): Promise<void> {
  try {
    await supabase
      .from("automation_runs")
      .update({ resultado, motivo, retomar_em: null, retomada_em: null, atualizada_em: new Date().toISOString() })
      .eq("id", execucaoId)
  } catch {
    // Fica "esperando" com `retomada_em`: depois de 5 minutos, a função de reivindicar a marca como falha
  }
}

/** Cancela as esperas do contato (CA-B28-16). Erro sobe para quem chamou decidir. */
export async function cancelarEsperasDoContato(
  supabase: ServiceClient,
  workspaceId: string,
  contactId: string,
  motivo: string
): Promise<void> {
  const { error } = await supabase
    .from("automation_runs")
    .update({ resultado: "cancelada", motivo, retomar_em: null, retomada_em: null, atualizada_em: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .eq("resultado", "esperando")
  if (error) throw error
}
