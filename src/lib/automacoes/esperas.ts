// Esperas das automações (B28-02 e B28-03). Quando o caminho chega num bloco
// "esperar", o motor (`index.ts`) grava a execução como "esperando", com o evento
// inteiro e a hora do relógio. Aqui ela segue, pela primeira opção que acontecer:
//
// - tempo: o relógio (rota /api/automacoes/relogio, que o gateway chama a cada
//   15 s) reivindica as esperas vencidas, e cada uma segue pela saída do tempo.
//   Sem o tempo, a hora do relógio é o teto de 30 dias, e a espera expira.
// - mensagem: a mensagem do contato, ou a de uma pessoa do time para ele, segue
//   as esperas dele antes das regras do próprio evento (SUP-B28-03), na fila do
//   contato. Daí em diante, as condições de mensagem leem a mensagem nova.
//
// Cada espera é seguida no máximo uma vez: o relógio e a mensagem só pegam a
// execução que ainda está livre (`retomada_em` nulo), e a que a função não
// terminou vira falha em vez de repetir, como a fila (B11-09).
//
// Contato na lixeira tem as esperas canceladas. A regra excluída, desativada ou sem
// o bloco cancela a espera quando ela vai seguir; o aviso antes de mudar a regra é da B28-04.
// Spec: pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md

import { createServiceClient } from "@/integrations/supabase/service"
import type { Json } from "@/integrations/supabase/types"
import {
  TETO_DA_ESPERA_MS,
  duracaoDaEspera,
  percorrerFluxo,
  type BlocoEspera,
  type Fluxo,
  type SaidaDaEspera,
} from "@/lib/fluxo-automacao"
import type { ContextoDaExecucao, GatilhoAutomacao, MensagemDoEvento, ServiceClient } from "./contexto"
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
/** CA-B28-14: o teto passou sem nenhuma das opções acontecer. */
export const ESPERA_EXPIROU = "A espera expirou depois de 30 dias"
const FORA_DO_FORMATO = "Não seguiu: a execução esperando está fora do formato"
const ERRO_AO_SEGUIR = "Erro inesperado ao seguir a espera"

/**
 * O evento como fica gravado na execução esperando. `mensagemDaEspera`: a mensagem
 * que acabou uma espera anterior, para as condições depois de uma segunda espera.
 */
type GatilhoGravado = GatilhoAutomacao & { mensagemDaEspera?: MensagemDoEvento }

/**
 * Quando o relógio pega o contato parado no bloco, contando de `desde`: a hora do
 * tempo; sem o tempo, o teto de 30 dias; "sem limite", nunca (`null`).
 */
export function horaDoRelogio(bloco: BlocoEspera, desde: Date): string | null {
  const duracao = bloco.tempo ? duracaoDaEspera(bloco.tempo) : bloco.limite === "30_dias" ? TETO_DA_ESPERA_MS : null
  return duracao === null ? null : new Date(desde.getTime() + duracao).toISOString()
}

/** `horaDoRelogio` do bloco "esperar" do fluxo em que o caminho parou. */
export function retomarEm(fluxo: Fluxo, esperaId: string, agora: Date): string | null {
  const bloco = fluxo.blocos.find((b) => b.id === esperaId)
  return bloco?.tipo === "espera" ? horaDoRelogio(bloco, agora) : null
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
    for (const execucao of vencidas) await seguirPeloRelogio(supabase, execucao)
    pegas += vencidas.length
    if (vencidas.length < ESPERAS_POR_VEZ) break
  }
  return pegas
}

/** O que a execução pega precisa para seguir. `null`: ela não segue, e já foi encerrada com o motivo. */
async function carregarParaSeguir(supabase: ServiceClient, execucao: ExecucaoEsperando) {
  const passos = (Array.isArray(execucao.caminho) ? execucao.caminho : []) as unknown as PassoGravado[]
  const ultimo = passos.at(-1)
  const gatilho = execucao.gatilho as unknown as GatilhoGravado | null
  if (ultimo?.bloco.tipo !== "espera" || !gatilho) {
    await terminar(supabase, execucao.id, "falhou", FORA_DO_FORMATO)
    return null
  }

  if (execucao.contact_id) {
    const { data: naLixeira } = await supabase.rpc("contato_na_lixeira", { p_contact_id: execucao.contact_id })
    if (naLixeira) {
      await terminar(supabase, execucao.id, "cancelada", CONTATO_NA_LIXEIRA)
      return null
    }
  }

  const { data: regra, error } = await supabase
    .from("automation_flows")
    .select("id, nome, ativa, fluxo")
    .eq("id", execucao.regra_id)
    .maybeSingle()
  if (error) throw error
  const motivo = !regra ? REGRA_EXCLUIDA : !regra.ativa ? REGRA_DESATIVADA : null
  const fluxo = regra ? lerFluxo(regra.fluxo) : null
  const bloco = fluxo?.blocos.find((b) => b.id === ultimo.bloco.id)
  if (motivo || !regra || !fluxo || bloco?.tipo !== "espera") {
    await terminar(supabase, execucao.id, "cancelada", motivo ?? BLOCO_SAIU)
    return null
  }
  return { regra: { id: regra.id, nome: regra.nome }, fluxo, bloco, passos, gatilho }
}

/**
 * A espera vencida segue pela saída do tempo; sem o tempo, o teto passou e ela
 * expira (CA-B28-14). Nunca lança: cada espera é isolada.
 */
async function seguirPeloRelogio(supabase: ServiceClient, execucao: ExecucaoEsperando): Promise<void> {
  try {
    const carregada = await carregarParaSeguir(supabase, execucao)
    if (!carregada) return
    const { bloco, passos } = carregada
    if (bloco.tempo) return await seguirPelaSaida(supabase, { execucaoId: execucao.id, ...carregada, saida: "tempo" })

    // Sem o tempo (talvez desligado depois que o contato entrou): vale o limite, desde a entrada
    const desde = new Date(passos[passos.length - 1].desde ?? Date.now())
    const hora = horaDoRelogio(bloco, desde)
    if (hora && new Date(hora).getTime() <= Date.now()) return await expirar(supabase, execucao.id, passos)
    await supabase
      .from("automation_runs")
      .update({ retomar_em: hora, retomada_em: null, atualizada_em: new Date().toISOString() })
      .eq("id", execucao.id)
  } catch {
    await terminar(supabase, execucao.id, "falhou", ERRO_AO_SEGUIR)
  }
}

/**
 * A mensagem do evento segue as esperas do contato que esperam por ela (B28-03):
 * a recebida, pela saída "Recebeu mensagem"; a do time, por "Atendente enviou".
 * Só as do próprio contato (SUP-B28-02), e nunca a execução que esta mesma mensagem
 * começou (CA-B28-12). Nunca lança: as regras do evento rodam depois, de qualquer jeito.
 */
export async function seguirEsperasPorMensagem(
  supabase: ServiceClient,
  gatilho: Extract<GatilhoAutomacao, { tipo: "mensagem_recebida" | "mensagem_enviada_time" }>
): Promise<void> {
  try {
    const saida: SaidaDaEspera = gatilho.tipo === "mensagem_recebida" ? "recebeu_mensagem" : "atendente_enviou"
    const mensagem: MensagemDoEvento = {
      conversationId: gatilho.conversationId,
      messageId: gatilho.messageId,
      tipoMensagem: gatilho.tipoMensagem,
      texto: gatilho.texto,
    }
    const { data, error } = await supabase
      .from("automation_runs")
      .select("id, regra_id, contact_id, gatilho, caminho")
      .eq("workspace_id", gatilho.workspaceId)
      .eq("contact_id", gatilho.contactId)
      .eq("resultado", "esperando")
      .is("retomada_em", null)
      .order("created_at")
    if (error) return

    for (const execucao of (data ?? []) as ExecucaoEsperando[]) {
      const gravado = execucao.gatilho as unknown as GatilhoGravado | null
      if (gravado && "messageId" in gravado && gravado.messageId === gatilho.messageId) continue
      // Pega a execução só se ela ainda está livre: o relógio pode ter chegado antes
      const { data: pega } = await supabase
        .from("automation_runs")
        .update({ retomada_em: new Date().toISOString() })
        .eq("id", execucao.id)
        .eq("resultado", "esperando")
        .is("retomada_em", null)
        .select("id")
      if (!pega || pega.length === 0) continue

      try {
        const carregada = await carregarParaSeguir(supabase, execucao)
        if (!carregada) continue
        const esperaPorEsta = saida === "recebeu_mensagem" ? carregada.bloco.recebeuMensagem : carregada.bloco.atendenteEnviou
        if (!esperaPorEsta) {
          await supabase.from("automation_runs").update({ retomada_em: null }).eq("id", execucao.id)
          continue
        }
        await seguirPelaSaida(supabase, { execucaoId: execucao.id, ...carregada, saida, mensagem })
      } catch {
        await terminar(supabase, execucao.id, "falhou", ERRO_AO_SEGUIR)
      }
    }
  } catch {
    // A espera segue na próxima mensagem ou pelo relógio
  }
}

/**
 * Continua a execução pela saída que a espera tomou, com o mesmo evento. O passo
 * do bloco ganha a saída e a hora; o resultado vale para o caminho inteiro. Num
 * segundo bloco "esperar", a mesma linha volta a esperar. `mensagem`: a que acabou
 * a espera, que as condições de depois leem (CA-B28-13).
 */
export async function seguirPelaSaida(
  supabase: ServiceClient,
  dados: {
    execucaoId: string
    regra: { id: string; nome: string }
    fluxo: Fluxo
    gatilho: GatilhoGravado
    passos: PassoGravado[]
    saida: SaidaDaEspera
    mensagem?: MensagemDoEvento
  }
): Promise<void> {
  const { fluxo, passos, saida } = dados
  const { mensagemDaEspera, ...gatilho } = dados.gatilho
  const mensagem = dados.mensagem ?? mensagemDaEspera
  const esperaId = passos[passos.length - 1].bloco.id
  const contexto: ContextoDaExecucao = { supabase, gatilho, regra: dados.regra, ...(mensagem ? { mensagem } : {}) }
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
      // Esperando de novo: a mensagem fica no evento, para as condições depois da próxima espera
      ...(caminho.espera && mensagem ? { gatilho: { ...gatilho, mensagemDaEspera: mensagem } as unknown as Json } : {}),
    })
    .eq("id", dados.execucaoId)
}

/** O teto passou: a execução termina sem seguir, com o passo do bloco marcando a hora. */
async function expirar(supabase: ServiceClient, execucaoId: string, passos: PassoGravado[]): Promise<void> {
  const agora = new Date().toISOString()
  const todos = passos.map((p, i) => (i === passos.length - 1 ? { ...p, em: agora } : p))
  await supabase
    .from("automation_runs")
    .update({
      resultado: resultadoDosPassos(todos),
      motivo: ESPERA_EXPIROU,
      caminho: todos as unknown as Json,
      retomar_em: null,
      retomada_em: null,
      atualizada_em: agora,
    })
    .eq("id", execucaoId)
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

/**
 * As execuções esperando numa regra, com o bloco em que cada uma está (B28-04).
 * `soFora`: só as que esperam num bloco que este fluxo não tem mais como "esperar".
 * Erro sobe.
 */
export async function esperasDaRegra(
  supabase: ServiceClient,
  workspaceId: string,
  regraId: string,
  soFora?: Fluxo
): Promise<string[]> {
  const { data, error } = await supabase
    .from("automation_runs")
    .select("id, caminho")
    .eq("workspace_id", workspaceId)
    .eq("regra_id", regraId)
    .eq("resultado", "esperando")
  if (error) throw error
  const continuam = new Set((soFora?.blocos ?? []).filter((b) => b.tipo === "espera").map((b) => b.id))
  return (data ?? [])
    .filter((e) => {
      if (!soFora) return true
      const passos = (Array.isArray(e.caminho) ? e.caminho : []) as unknown as PassoGravado[]
      return !continuam.has(passos.at(-1)?.bloco.id ?? "")
    })
    .map((e) => e.id)
}

/** Cancela estas execuções, se ainda estiverem esperando. Erro sobe. */
export async function cancelarEsperas(supabase: ServiceClient, ids: string[], motivo: string): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from("automation_runs")
    .update({ resultado: "cancelada", motivo, retomar_em: null, retomada_em: null, atualizada_em: new Date().toISOString() })
    .in("id", ids)
    .eq("resultado", "esperando")
    // A que está seguindo agora (pega pelo relógio ou por uma mensagem) termina como seguiu
    .is("retomada_em", null)
  if (error) throw error
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
